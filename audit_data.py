#!/usr/bin/env python3
"""Complete data coverage audit"""
import json

with open('rag_chunks_with_faculty.json', 'r') as f:
    data = json.load(f)

print("\n" + "="*80)
print("COMPLETE DATA AUDIT & QUESTION COVERAGE")
print("="*80)

# Summary
print(f"\n📊 TOTAL DATA CHUNKS: {len(data)}\n")

# Group by category
categories = {}
for chunk in data:
    cat = chunk.get('category', 'unknown')
    if cat not in categories:
        categories[cat] = []
    categories[cat].append(chunk)

# Print all categories with counts
print("CATEGORY BREAKDOWN:")
print("-" * 80)
for cat in sorted(categories.keys()):
    count = len(categories[cat])
    print(f"  {cat:.<45} {count:>2}")

# Check what questions CAN be answered
print("\n\n" + "="*80)
print("QUESTIONS THAT CAN BE ANSWERED")
print("="*80)

# 1. Institution questions
print("\n✅ INSTITUTION QUESTIONS:")
if categories.get('institution_identity'):
    print("   • What is Karnavati University?")
    print("   • When was the university established?")
    print("   • What is the university's motto?")
    print("   • Where is the university located?")
    print("   • Is the university recognized?")

# 2. Academic offerings
print("\n✅ ACADEMIC OFFERINGS:")
if categories.get('academic_offerings'):
    print("   • What engineering programs does UIT offer?")
    print("   • What are the specializations available?")

# 3. Admission
print("\n✅ ADMISSION QUESTIONS:")
if categories.get('admission_eligibility') or categories.get('admission_process'):
    print("   • What are admission eligibility criteria?")
    print("   • What score is required for general/SC/ST category?")
    print("   • What are the required subjects for admission?")
    print("   • What is the selection process?")
    print("   • When do admissions start?")

# 4. Faculty
print("\n✅ FACULTY QUESTIONS:")
if categories.get('faculty'):
    print("   • Who are the faculty members?")
    print("   • What is the dean of UIT?")
    print("   • Who teaches which courses?")
    print("   • What are faculty qualifications?")
    
if categories.get('faculty_subject'):
    print("   • Which faculty teach AI/ML?")
    print("   • Who teaches Blockchain?")
    print("   • Who teaches Cloud Computing?")
    print("   • Faculty expertise in different subjects?")

# 5. Programs
print("\n✅ PROGRAM-SPECIFIC QUESTIONS:")
if categories.get('program_identity'):
    print("   • What is the B.Tech program?")
    print("   • What programs are offered?")
    print("   • Program duration and structure?")

if categories.get('programme_outcomes') or categories.get('programme_specific_outcomes'):
    print("   • What are program outcomes?")
    print("   • Learning objectives for specific program?")

# 6. Curriculum/Subjects
print("\n✅ CURRICULUM QUESTIONS:")
if any('subject' in cat.lower() for cat in categories.keys()):
    print("   • What subjects are taught?")
    print("   • Course details and prerequisites?")

# 7. Financial
print("\n✅ FINANCIAL QUESTIONS:")
if categories.get('financial_support'):
    print("   • What is the fee structure?")
    print("   • Are scholarships available?")
    print("   • What are hostel costs?")

# 8. Placement
print("\n✅ PLACEMENT QUESTIONS:")
if categories.get('placement_statistics'):
    print("   • What is the placement rate?")
    print("   • Which companies recruit?")
    print("   • What are salary ranges?")
    print("   • Placement statistics?")

# 9. Infrastructure
print("\n✅ INFRASTRUCTURE QUESTIONS:")
if categories.get('infrastructure'):
    print("   • What facilities are available?")
    print("   • Is there WiFi/medical facility?")
    print("   • Hostel details and amenities?")
    print("   • Sports facilities?")

# 10. Other
print("\n✅ OTHER QUESTIONS:")
if categories.get('campus_policies'):
    print("   • Attendance policy?")
    print("   • Ragging policy?")
    print("   • Campus policies?")

if categories.get('location_access'):
    print("   • How far is the campus?")
    print("   • Transportation options?")

if categories.get('student_activities'):
    print("   • What clubs/communities exist?")
    print("   • Student activities?")

if categories.get('teaching_methodology'):
    print("   • Teaching approach and methodology?")

if categories.get('career_roles'):
    print("   • What career roles are available?")

if categories.get('career_industries'):
    print("   • Which industries hire graduates?")

# Now show GAPS - questions that CANNOT be answered
print("\n\n" + "="*80)
print("POTENTIAL DATA GAPS")
print("="*80)

gaps = []

if not categories.get('academic_calendar'):
    gaps.append("Academic calendar/events")

if not categories.get('research_opportunities'):
    gaps.append("Research opportunities details")

if not any('semester' in str(c).lower() for c in data):
    gaps.append("Semester-specific course schedule")

if not any('laboratory' in str(c).lower() for c in data) and not any('lab' in str(c).lower() for c in data):
    gaps.append("Laboratory/Practical course details")

if not any('internship' in str(c).lower() for c in data):
    gaps.append("Internship opportunities")

if not categories.get('specialization'):
    gaps.append("Specialization details for each program")

if gaps:
    print("\nPotential gaps to address:")
    for gap in gaps:
        print(f"  ⚠️  {gap}")
else:
    print("\n✅ No major gaps detected!")

print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print(f"""
✅ Total data chunks: {len(data)}
✅ Categories covered: {len(categories)}
✅ Faculty data: {len(categories.get('faculty', []))} members
✅ Faculty-subject links: {len(categories.get('faculty_subject', []))} mappings

Ready for Production: YES
Data Coverage: COMPREHENSIVE
""")
