import asyncio
import httpx
import uuid

API_BASE = "http://localhost:8000"

async def test_submission_uniqueness():
    print("Starting submission uniqueness test...")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Login as admin
        login_resp = await client.post(
            f"{API_BASE}/api/auth/login",
            json={"username": "admin", "password": "adminpassword3012"}
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Logged in successfully.")

        # 2. Create a test form
        slug = f"test-uniqueness-{uuid.uuid4().hex[:8]}"
        form_payload = {
            "name": "Test Uniqueness Form",
            "slug": slug,
            "description": "Form for testing concurrent submission ID uniqueness",
            "is_active": True,
            "unique_field_ids": []
        }
        form_resp = await client.post(
            f"{API_BASE}/api/forms/",
            json=form_payload,
            headers=headers
        )
        assert form_resp.status_code == 201, f"Form creation failed: {form_resp.text}"
        form_data = form_resp.json()
        form_id = form_data["id"]
        print(f"Created test form with ID: {form_id} and slug: {slug}")

        # 3. Submit 50 submissions concurrently
        print("Submitting 50 submissions concurrently...")
        submission_payload = {
            "values": [],
            "file_uploads": []
        }
        
        async def post_submission():
            resp = await client.post(
                f"{API_BASE}/api/submissions/{form_id}",
                json=submission_payload
            )
            return resp

        tasks = [post_submission() for _ in range(50)]
        results = await asyncio.gather(*tasks)

        # 4. Verify results
        status_codes = [r.status_code for r in results]
        success_count = status_codes.count(201)
        print(f"Concurrency results: {success_count}/50 succeeded.")
        
        for idx, r in enumerate(results):
            if r.status_code != 201:
                print(f"Failed submission {idx}: Status {r.status_code}, Body: {r.text}")
        
        assert success_count == 50, f"Some submissions failed! Expected 50 successes, got {success_count}"

        submission_ids = [r.json()["submission_id"] for r in results if r.status_code == 201]
        unique_submission_ids = set(submission_ids)
        
        print(f"Total submission IDs: {len(submission_ids)}")
        print(f"Unique submission IDs: {len(unique_submission_ids)}")
        
        assert len(submission_ids) == len(unique_submission_ids), "Duplicate submission IDs generated!"
        print("All submission IDs are unique!")

        # 5. Clean up: delete test form
        del_resp = await client.delete(
            f"{API_BASE}/api/forms/{form_id}",
            headers=headers
        )
        assert del_resp.status_code == 200 or del_resp.status_code == 204 or del_resp.status_code == 404, f"Clean up failed: {del_resp.text}"
        print("Test form cleaned up successfully.")
        print("Submission uniqueness test PASSED!")

if __name__ == "__main__":
    asyncio.run(test_submission_uniqueness())
