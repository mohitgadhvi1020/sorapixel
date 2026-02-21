import asyncio
import os
import sys

# Add the backend directory to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_supabase

def check_accounts():
    print("Connecting to Supabase...")
    sb = get_supabase()
    
    phone = "9999999999"
    print(f"Querying accounts for phone: {phone}")
    
    result = sb.table("clients").select("*").eq("phone", phone).execute()
    
    accounts = result.data
    print(f"Found {len(accounts)} account(s) with phone {phone}:")
    
    for idx, acc in enumerate(accounts):
        print(f"\nAccount {idx + 1}:")
        print(f"  ID: {acc.get('id')}")
        print(f"  Name: {acc.get('contact_name')}")
        print(f"  Email: {acc.get('email')}")
        print(f"  Credits: {acc.get('token_balance')}")
        print(f"  Created At: {acc.get('created_at')}")
    print("\nChecking for user by auth ID: 0856ccb9-9bea-4a7a-86de-dec3439525b1")
    id_result = sb.table("clients").select("*").eq("id", "0856ccb9-9bea-4a7a-86de-dec3439525b1").execute()
    
    if id_result.data:
        print(f"Found user by ID! Credits: {id_result.data[0].get('token_balance')}")
    else:
        print("User NOT found by ID either!")

if __name__ == "__main__":
    check_accounts()
