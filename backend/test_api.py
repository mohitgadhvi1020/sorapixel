import os
import sys

# Add the backend directory to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_supabase
import httpx

def test_api():
    print("Logging in to Supabase with OTP...")
    sb = get_supabase()
    
    # Verify OTP directly for the test phone number
    resp = sb.auth.verify_otp({"phone": "+919999999999", "token": "123456", "type": "sms"})
    token = resp.session.access_token
    print(f"Got token: {token[:20]}...")
    
    # Hit the Render API
    # Hit Supabase /auth/v1/user directly
    print("Fetching Supabase user...")
    user_resp = httpx.get(
        "https://ynxppssttkicwglxiraw.supabase.co/auth/v1/user",
        headers={
            "Authorization": f"Bearer {token}",
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHBwc3N0dGtpY3dnbHhpcmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNTA0NTAsImV4cCI6MjA4NjgyNjQ1MH0.XAFb4USg6OawTuGo4q3fTwHrICH_8x8XsTRBOSbEzI8"
        }
    )
    print(f"User resp: {user_resp.status_code}")
    print(user_resp.text[:500])

    print("\nHitting local API /users/me ...")
    api_resp = httpx.get(
        "http://localhost:8000/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {api_resp.status_code}")
    print(f"Response: {api_resp.text}")

if __name__ == "__main__":
    test_api()
