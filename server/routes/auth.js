const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const dns = require('dns'); // Native Node.js DNS module for validation

// Load environment variables
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_123';

// SUPER ADMIN CREDENTIALS
const SUPER_ADMIN_EMAIL = "aj@gmail.com";
const SUPER_ADMIN_PASS = "aj@123";

// Configure Email Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- MODERN EMAIL TEMPLATE ---
const getOtpTemplate = (otp, action = "Account Verification") => `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #f0f0f0;">
    <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">TimetableAI</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Secure Access Portal</p>
    </div>
    
    <div style="padding: 40px 30px; text-align: center;">
        <h2 style="color: #1f2937; font-size: 20px; margin-top: 0; margin-bottom: 16px;">${action}</h2>
        <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Hello, please use the verification code below to complete your request. This code will expire in 10 minutes.
        </p>
        
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: inline-block; border: 1px dashed #d1d5db;">
            <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; color: #4f46e5; letter-spacing: 4px;">${otp}</span>
        </div>

        <p style="color: #9ca3af; font-size: 13px; margin: 0;">
            If you did not request this, you can safely ignore this email.
        </p>
    </div>
    
    <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #f3f4f6;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">
            © ${new Date().getFullYear()} TimetableAI Systems. All rights reserved.
        </p>
    </div>
</div>
`;

// Helper to send email (Now supports HTML)
const sendEmail = (to, subject, htmlContent) => {
    const mailOptions = {
        from: `"TimetableAI Security" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: htmlContent
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("❌ Email Send Failed:", error.message);
        } else {
            console.log('✅ Email Sent:', info.response);
        }
    });
};

// Helper: Generate School ID
const generateSchoolId = () => `SCH-${Math.floor(1000 + Math.random() * 9000)}`;

// Helper: Validate Email Domain (DNS Check)
const validateEmailDomain = (email) => {
    return new Promise((resolve) => {
        const domain = email.split('@')[1];
        if (!domain) return resolve(false);

        dns.resolveMx(domain, (err, addresses) => {
            if (err || !addresses || addresses.length === 0) {
                resolve(false); // Domain has no mail servers (e.g. gamil.com)
            } else {
                resolve(true);  // Domain exists
            }
        });
    });
};

// 1. REGISTER
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, schoolId } = req.body;

        if (email === SUPER_ADMIN_EMAIL) {
            return res.status(403).json({ message: "Cannot register as Super Admin. Please login directly." });
        }

        // 1. Check if User Exists
        let user = await User.findOne({ email });
        if (user && user.isVerified) return res.status(400).json({ message: "User already exists" });

        // 2. Validate Email Domain
        const isDomainValid = await validateEmailDomain(email);
        if (!isDomainValid) {
            return res.status(400).json({ message: "Invalid email domain. Please check your email address." });
        }

        // 3. School ID Logic
        let finalSchoolId = schoolId;
        if (role === 'admin') {
            if (!finalSchoolId) finalSchoolId = generateSchoolId();
        } else {
            if (!finalSchoolId) return res.status(400).json({ message: "School Code is required for Students/Teachers." });

            const adminExists = await User.findOne({ schoolId: finalSchoolId, role: 'admin' });
            if (!adminExists) return res.status(400).json({ message: "Invalid School Code. Institution not found." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        if (user && !user.isVerified) {
            user.name = name;
            user.password = hashedPassword;
            user.role = role || 'student';
            user.schoolId = finalSchoolId;
            user.otp = otp;
            user.otpExpires = otpExpires;
        } else {
            user = new User({
                name,
                email,
                password: hashedPassword,
                role: role || 'student',
                schoolId: finalSchoolId,
                otp,
                otpExpires,
                isVerified: false
            });
        }

        await user.save();

        console.log(`\n🔑 [SIGNUP OTP] for ${email}: ${otp} (School: ${finalSchoolId})\n`);

        // Send Professional HTML Email
        sendEmail(
            email,
            'Verify Your Account',
            getOtpTemplate(otp, "Sign Up Verification")
        );

        res.status(200).json({ message: "OTP sent to email" });

    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. VERIFY SIGNUP OTP
router.post('/verify-signup', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({
            email,
            otp,
            otpExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ message: "Invalid or expired OTP" });

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ message: "Account verified! Please login." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // SUPER ADMIN LOGIN
        if (email === SUPER_ADMIN_EMAIL) {
            if (password === SUPER_ADMIN_PASS) {
                const token = jwt.sign({
                    id: "SUPER_ADMIN",
                    role: "developer",
                    name: "Super Admin",
                    schoolId: "GLOBAL"
                }, JWT_SECRET, { expiresIn: '1d' });

                res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 24 * 3600000 });

                return res.json({
                    token,
                    user: { id: "SUPER_ADMIN", name: "Super Admin", role: "developer", schoolId: "GLOBAL" }
                });
            } else {
                return res.status(400).json({ message: "Invalid Super Admin credentials" });
            }
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });
        if (!user.isVerified) return res.status(400).json({ message: "Account not verified. Please sign up again to verify." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({
            id: user._id,
            role: user.role,
            schoolId: user.schoolId
        }, JWT_SECRET, { expiresIn: '1d' });

        res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 24 * 3600000 });

        res.json({ token, user: { id: user._id, name: user.name, role: user.role, schoolId: user.schoolId } });

    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. FORGOT PASSWORD REQUEST
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (email === SUPER_ADMIN_EMAIL) return res.status(403).json({ message: "Super Admin cannot reset password via email." });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        console.log(`\n🔑 [RESET PASSWORD OTP] for ${email}: ${otp}\n`);

        // Send Professional HTML Email
        sendEmail(
            email,
            'Reset Password Request',
            getOtpTemplate(otp, "Password Reset")
        );

        res.json({ message: "OTP sent (Check email or server logs)" });

    } catch (err) {
        console.error("Forgot Password Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 5. RESET PASSWORD CONFIRM
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const user = await User.findOne({
            email,
            otp,
            otpExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ message: "Invalid or expired OTP" });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        user.otp = undefined;
        user.otpExpires = undefined;

        await user.save();

        res.json({ message: "Password updated successfully. Please login." });
    } catch (err) {
        console.error("Reset Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// OTHER ROUTES
router.post('/logout', (req, res) => { res.clearCookie('token'); res.json({ message: "Logged out" }); });
router.get('/me', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.json(null);
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.id === "SUPER_ADMIN") {
            return res.json({ id: "SUPER_ADMIN", name: "Super Admin", role: "developer", schoolId: "GLOBAL" });
        }

        const user = await User.findById(decoded.id).select('-password');
        if (!user) return res.json(null);
        res.json(user);
    } catch (err) { res.json(null); }
});

module.exports = router;