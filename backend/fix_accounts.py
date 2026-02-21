import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_supabase
import httpx

def fix_accounts():
    sb = get_supabase()
    
    print("1. Deleting conflicting old record (85dd8dde...)")
    sb.table("clients").delete().eq("id", "85dd8dde-f453-4e07-bfb1-e282f8dc8e31").execute()
    
    print("2. Re-verifying OTP to trigger middleware to create the correct row...")
    resp = sb.auth.verify_otp({"phone": "+919999999999", "token": "123456", "type": "sms"})
    token = resp.session.access_token
    user_id = resp.user.id
    print(f"Logged in new auth user: {user_id}")
    
    # Hit the local API to trigger the middleware
    api_resp = httpx.get(
        "http://localhost:8000/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Middleware triggered via local API. Status: {api_resp.status_code}")
    print(api_resp.json())
    
    print(f"3. Giving 1000 credits to correct user: {user_id}!")
    res = sb.table("clients").update({"token_balance": 1000}).eq("id", user_id).execute()
    print("Update result:", res.data)
    
    new_res = sb.table("clients").select("*").eq("id", user_id).execute()
    print(f"Verification - New Balance: {new_res.data[0].get('token_balance') if new_res.data else 'Failed!'}")

if __name__ == "__main__":
    fix_accounts()
