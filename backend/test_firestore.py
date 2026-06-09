import asyncio
import os
from dotenv import load_dotenv
from google.cloud import firestore

# Load dotenv
load_dotenv()

async def test():
    project_id = os.getenv("FIREBASE_PROJECT_ID", "playsphere-ai")
    credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    print(f"Project ID: {project_id}")
    print(f"Credentials Path: {credentials_path}")
    
    try:
        if credentials_path and os.path.exists(credentials_path):
            import google.oauth2.service_account
            cred = google.oauth2.service_account.Credentials.from_service_account_file(
                credentials_path
            )
            db = firestore.AsyncClient(credentials=cred, project=cred.project_id)
            print("Initialized with service account JSON.")
        else:
            db = firestore.AsyncClient(project=project_id)
            print("Initialized with default credentials / environment ID.")
            
        print("Testing Firestore write...")
        test_ref = db.collection("test_connectivity").document("status")
        await test_ref.set({"connected": True, "timestamp": firestore.SERVER_TIMESTAMP})
        print("Write successful!")
        
        print("Testing Firestore read...")
        doc = await test_ref.get()
        print(f"Read successful: {doc.to_dict()}")
        
        # Cleanup
        await test_ref.delete()
        print("Cleanup successful! Firestore connection is fully working.")
        
    except Exception as e:
        print(f"Connection test failed: {e}")
        print("\nPlease verify that:")
        print("1. Your environment has Application Default Credentials configured, OR")
        print("2. You set FIREBASE_CREDENTIALS_PATH in backend/.env pointing to a valid service account JSON.")

if __name__ == "__main__":
    asyncio.run(test())
