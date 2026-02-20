#!/usr/bin/env python
"""
Quick API test - run this to check what the backend actually returns.
Usage: cd backend && python test_api.py
"""

import requests
import json

BASE = "http://localhost:8000/api"

# 1. Login
print("=== 1. Login ===")
r = requests.post(f"{BASE}/auth/login/", json={"username": "admin", "password": "admin123"})
print(f"Status: {r.status_code}")
data = r.json()
print(json.dumps(data, indent=2, ensure_ascii=False)[:400])

token = data.get("data", {}).get("access") or data.get("access", "")
if not token:
    print("ERROR: No token! Trying different password...")
    r = requests.post(f"{BASE}/auth/login/", json={"username": "admin", "password": "Admin123!"})
    data = r.json()
    token = data.get("data", {}).get("access") or data.get("access", "")
    print(f"Token received: {bool(token)}")

if not token:
    print("CANNOT CONTINUE - no token!")
    exit(1)

headers = {"Authorization": f"Bearer {token}"}

# 2. List courses
print("\n=== 2. GET /api/courses/ ===")
r = requests.get(f"{BASE}/courses/", headers=headers)
print(f"Status: {r.status_code}")
data = r.json()
print(f"success: {data.get('success')}, count: {data.get('count')}")
courses = data.get("data", [])
print(f"Courses: {[c.get('id') for c in courses]}")

if not courses:
    print("NO COURSES RETURNED - check if user has allowed_courses assigned!")
    exit(1)

course_id = courses[0]["id"]
print(f"Using course ID: {course_id}")

# 3. Course detail
print(f"\n=== 3. GET /api/courses/{course_id}/ ===")
r = requests.get(f"{BASE}/courses/{course_id}/", headers=headers)
print(f"Status: {r.status_code}")
data = r.json()
print(f"success: {data.get('success')}")
course = data.get("data", {})
videos = course.get("videos", [])
print(f"Videos in course: {len(videos)}")
for v in videos[:3]:
    print(f"  - id={v.get('id')}, title={v.get('title_en')}, published={v.get('is_published')}")

if not videos:
    print("NO VIDEOS - check backend: is_published filter, allowed_courses, or simply no videos uploaded!")
    # List all videos regardless
    print("\n=== Checking /api/admin/videos/ ===")
    r = requests.get(f"{BASE}/admin/videos/", headers=headers)
    if r.status_code == 200:
        vdata = r.json()
        all_videos = vdata.get("data", [])
        print(f"Total videos in admin: {len(all_videos)}")
        for v in all_videos[:5]:
            print(f"  - id={v.get('id')}, course={v.get('course')}, published={v.get('is_published')}, title={v.get('title_en')}")
    else:
        print(f"Admin videos not accessible: {r.status_code}")

# 4. Test one video detail
if videos:
    vid = videos[0]
    print(f"\n=== 4. GET /api/videos/{vid['id']}/ ===")
    r = requests.get(f"{BASE}/videos/{vid['id']}/", headers=headers)
    print(f"Status: {r.status_code}")
    vdata = r.json()
    print(f"success: {vdata.get('success')}")
    vd = vdata.get("data", {})
    print(f"stream_token: {vd.get('stream_token', 'MISSING')}")
    print(f"is_published: {vd.get('is_published')}")

print("\n✅ Test complete!")
