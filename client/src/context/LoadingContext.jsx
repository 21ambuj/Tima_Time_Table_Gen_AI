import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';
import Loader from '../components/Loader';

const LoadingContext = createContext();

export const useLoader = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Processing...");

  const showLoader = useCallback((msg = "Processing...") => {
    setMessage(msg);
    setIsLoading(true);
  }, []);

  const hideLoader = useCallback(() => {
    setIsLoading(false);
  }, []);

  const value = useMemo(() => ({ showLoader, hideLoader }), [showLoader, hideLoader]);

  return (
    <LoadingContext.Provider value={value}>
      {/* This renders the Loader on top of the entire app */}
      {isLoading && <Loader message={message} />}
      {children}
    </LoadingContext.Provider>
  );
};