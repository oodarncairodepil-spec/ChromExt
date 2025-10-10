// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore: Deno global is available in Supabase Edge Functions
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // This function should be publicly accessible for email verification
  // No authentication required for auth callbacks
  
  // Log the request for debugging
  console.log('Auth callback request:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  try {
    const url = new URL(req.url)
    
    // Get the hash fragment from the URL (if passed as a query parameter)
    const hashFragment = url.searchParams.get('hash') || url.hash.substring(1)
    
    // Parse the hash parameters
    const hashParams = new URLSearchParams(hashFragment)
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const tokenType = hashParams.get('token_type')
    const expiresIn = hashParams.get('expires_in')
    const type = hashParams.get('type')

    // Create a success HTML response with congratulations message
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification Successful</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .success-container {
             background: white;
             border-radius: 16px;
             padding: 48px 32px;
             text-align: center;
             box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
             max-width: 400px;
             width: 90%;
             display: none;
         }
        .success-icon {
            width: 64px;
            height: 64px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }
        .checkmark {
            width: 32px;
            height: 32px;
            stroke: white;
            stroke-width: 3;
            fill: none;
        }
        .success-title {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 12px;
        }
        .success-message {
            font-size: 16px;
            color: #6b7280;
            line-height: 1.5;
            margin-bottom: 32px;
        }
        .close-instruction {
            font-size: 14px;
            color: #9ca3af;
            padding: 16px;
            background: #f9fafb;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
        }
        .loading {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              text-align: center;
              color: #6b7280;
          }
    </style>
</head>
<body>
    <div class="success-container">
        <div class="success-icon">
            <svg class="checkmark" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4"/>
            </svg>
        </div>
        <h1 class="success-title">Email Verified Successfully!</h1>
        <p class="success-message">
            Congratulations! Your email has been verified and you're now ready to use the app.
        </p>
        <div class="close-instruction">
            <strong>Next step:</strong> Please close this tab and return to your Chrome extension to continue.
        </div>
    </div>
    <div class="loading">Processing verification...</div>

    <script>
        // Get authentication data from URL hash or server-side data
        const authData = {
            access_token: '${accessToken || ''}',
            refresh_token: '${refreshToken || ''}',
            token_type: '${tokenType || 'bearer'}',
            expires_in: '${expiresIn || '3600'}',
            type: '${type || 'signup'}'
        };

        function handleAuthCallback() {
            try {
                // Check if we have authentication data
                if (!authData.access_token || !authData.refresh_token) {
                    // Try to get from URL hash as fallback
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    authData.access_token = hashParams.get('access_token') || authData.access_token;
                    authData.refresh_token = hashParams.get('refresh_token') || authData.refresh_token;
                    authData.token_type = hashParams.get('token_type') || authData.token_type;
                    authData.expires_in = hashParams.get('expires_in') || authData.expires_in;
                    authData.type = hashParams.get('type') || authData.type;
                }

                if (!authData.access_token || !authData.refresh_token) {
                    throw new Error('Missing authentication tokens');
                }

                // Store in localStorage for the extension to pick up
                try {
                    localStorage.setItem('supabase.auth.token', JSON.stringify({
                        access_token: authData.access_token,
                        refresh_token: authData.refresh_token,
                        expires_in: parseInt(authData.expires_in),
                        token_type: authData.token_type,
                        expires_at: Date.now() + (parseInt(authData.expires_in) * 1000)
                    }));
                    
                    // Store verification success flag with timestamp
                    localStorage.setItem('email_verification_success', 'true');
                    localStorage.setItem('verification_timestamp', Date.now().toString());
                } catch (e) {
                    console.log('localStorage not available');
                }
                
                // Try to communicate with Chrome extension if available
                if (typeof chrome !== 'undefined' && chrome.runtime) {
                    try {
                        chrome.runtime.sendMessage({
                            type: 'EMAIL_VERIFIED',
                            session: {
                                access_token: authData.access_token,
                                refresh_token: authData.refresh_token,
                                expires_in: parseInt(authData.expires_in),
                                token_type: authData.token_type
                            }
                        });
                    } catch (e) {
                        console.log('Chrome extension communication not available');
                    }
                }
                
                // Show success message instead of trying to close window
                document.querySelector('.loading').style.display = 'none';
                document.querySelector('.success-container').style.display = 'block';
                
            } catch (error) {
                console.error('Auth callback error:', error);
                // Show error message
                document.querySelector('.loading').innerHTML = 'Verification failed. Please try again or contact support.';
                document.querySelector('.loading').style.color = '#ef4444';
            }
        }

        // Handle the authentication callback when the page loads
        document.addEventListener('DOMContentLoaded', handleAuthCallback);
        // Also run immediately in case DOMContentLoaded already fired
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', handleAuthCallback);
        } else {
            handleAuthCallback();
        }
    </script>
</body>
</html>
    `

    // IMPORTANT: send HTML with a clean header set
    const headers = new Headers()
    headers.set('content-type', 'text/html; charset=utf-8')
    headers.set('cache-control', 'no-store')
    headers.set('x-content-type-options', 'nosniff')
    // Remove sandbox restrictions and allow all necessary permissions
    headers.set('content-security-policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-src 'self'; sandbox allow-scripts allow-same-origin allow-forms allow-popups allow-modals;")
    headers.set('x-frame-options', 'SAMEORIGIN')
    headers.set('referrer-policy', 'strict-origin-when-cross-origin')

    return new Response(html, { status: 200, headers })
  } catch (error) {
    console.error('Error in auth callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      },
    )
  }
})