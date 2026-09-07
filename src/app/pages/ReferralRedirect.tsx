import { useEffect } from "react";
import { useParams } from "react-router";

/**
 * Handles referral links (e.g. /refer/ABC123) by redirecting 
 * users to the Google Play Store with the install referrer.
 */
export const ReferralRedirect = () => {
  const { code } = useParams();

  useEffect(() => {
    const PACKAGE_NAME = "com.kfpcl.deliveryapp";
    const playStoreUrl = `https://play.google.com/store/apps/details?id=${PACKAGE_NAME}`;
    
    if (code) {
      // Build the referrer URL that survival install
      const referrer = encodeURIComponent(`referralCode=${code.toUpperCase()}`);
      const finalUrl = `${playStoreUrl}&referrer=${referrer}`;
      
      // Perform the redirect
      window.location.replace(finalUrl);
    } else {
      // Fallback to home if no code
      window.location.replace("/");
    }
  }, [code]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '60vh',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h2 style={{ color: '#1E5AFA', marginBottom: '10px' }}>Redirecting to Play Store...</h2>
      <p>If you are not redirected automatically, <a href="https://play.google.com/store/apps/details?id=com.kfpcl.deliveryapp" style={{ color: '#1E5AFA', fontWeight: 'bold' }}>click here</a>.</p>
    </div>
  );
};

