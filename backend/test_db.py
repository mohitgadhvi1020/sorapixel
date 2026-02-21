import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_supabase

def read_schema():
    sb = get_supabase()
    
    # Let's try to update something else, like "company_name"
    user_id = "0856ccb9-9bea-4a7a-86de-dec3439525b1"
    print("Updating both company_name and token_balance...")
    res = sb.table("clients").update({
        "company_name": "TestCorp2", 
        "token_balance": 1000
    }).eq("id", user_id).execute()
    print("Result:", res.data)
    
if __name__ == "__main__":
    read_schema()
