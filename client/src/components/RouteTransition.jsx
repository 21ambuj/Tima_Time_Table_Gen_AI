import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLoader } from '../context/LoadingContext';

const RouteTransition = () => {
    const location = useLocation();
    const { showLoader, hideLoader } = useLoader();
    // Keep track of the previous path to avoid triggering on the very first mount if handled by AuthContext
    const prevPath = useRef(location.pathname);

    useEffect(() => {
        // If the path hasn't changed, do nothing
        if (prevPath.current === location.pathname) return;

        // Update ref
        prevPath.current = location.pathname;

        // Trigger loader
        showLoader("Loading Please wait...");

        // Simulate loading time (since we don't have real page transition events in client-side routing)
        const timer = setTimeout(() => {
            hideLoader();
        }, 800); // 0.8 second loader for smooth transition

        return () => clearTimeout(timer);
    }, [location, showLoader, hideLoader]);

    return null;
};

export default RouteTransition;
