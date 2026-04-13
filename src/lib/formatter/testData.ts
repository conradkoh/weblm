/**
 * Test data for formatter testing.
 * Unstructured case report → Structured presentation template
 */

// Unstructured case report - approximately 2500 words
// Written in clinical/professional notes style with scattered information
export const TEST_SOURCE_CONTENT = `
CASE FILE: Sarah Mitchell
Date of Assessment: March 15, 2024
Clinician: Dr. James Thompson, LCSW
Referral Source: Dr. Rebecca Chen, Primary Care Physician
Contact: (555) 234-5678

---

INITIAL CONTACT NOTES (March 5, 2024):

Sarah was referred by her primary care physician due to ongoing concerns about anxiety and work-related stress. She arrived about 15 minutes late, which she attributed to parking difficulties near the office. 

BACKGROUND:
Sarah is a 34-year-old woman who works as a software engineer at a mid-sized tech company. She has been employed there for approximately 4 years. Prior to that, she worked at two other companies - one for 2 years and one for just under a year. She mentioned she left her first job because of "management issues" and her second job because the company was "going through restructuring."

She's the middle child in her family. Has an older brother, David, who is 36, and a younger sister, Jennifer, who is 29. David works in finance in New York. Jennifer is a teacher and lives locally. Parents are both retired - father was a mechanical engineer, mother was a bookkeeper. Family lives in Ohio, Sarah moved to this area for work 8 years ago.

EDUCATION:
She completed her Bachelor's degree in Computer Science at State University in 2012. Then got her Master's in 2014. While she was in school, she worked part-time at the campus bookstore. She mentioned she enjoyed school but found the transition to full-time work challenging. "I went from being good at everything to being the new person who didn't know anything," she said.

EMPLOYMENT HISTORY from resume review:
- TechStart Solutions (2016-2018): Junior Developer
- DataFlow Inc. (2018-2019): Software Engineer (left during layoffs)
- Current: InnovateTech (2019-Present): Software Engineer, promoted to Senior in 2022

PRESENTION OF CONCERNS (written by client prior to session):

I've been feeling overwhelmed at work for the past several months. The demands keep increasing and I never feel like I'm doing enough. I've started dreading going to the office and sometimes I feel like I can't breathe when I'm in meetings. My manager has been asking for more frequent status updates and I feel like I'm constantly being watched. Last week I made a small mistake on a project and I've been catastrophizing about it ever since, convinced I'll be fired even though my manager said it wasn't a big deal.

I also have been having trouble sleeping. Usually I'm fine once I'm asleep but it takes me hours to fall asleep because my mind is racing. I've tried the usual stuff - no screens before bed, etc. - but nothing seems to help much. I exercise regularly, about 4-5 times per week, which does help somewhat but lately even that doesn't seem to be enough.

My boyfriend, Marcus, has noticed I've been more irritable at home. We've been together for 3 years and he's supportive but I can tell he's getting frustrated. We had a big argument last weekend about how I "never relax" and I admit that even when we try to spend time together, I'm checking Slack notifications constantly.

I've been thinking about whether I need to take some time off but I feel like I can't - there's too much work and too many people depending on me. Plus we have a vacation planned for May and a wedding in June so the timing is bad. Also, I'm the only one on my team who knows the legacy codebase so I feel like I can't really be absent.

Note: Client mentioned she used to see a therapist in college for about a year after a breakup. Said it was helpful but she "aged out" of the counseling center services. No history of psychiatric hospitalization or medication trials.

OBSERVATIONS FROM SESSION:
Client presented as an articulate and intelligent individual. She made good eye contact and was engaged throughout the session. At times she became tearful when discussing her work stress. She was insightful about her patterns - she identified that she tends to take on more responsibility than necessary and has difficulty saying no. She acknowledged that this is something she's struggled with since childhood, noting her parents were "not the type to say no to anyone."

She appears to have good social support - has a close group of friends from college, maintains regular contact with her family, and has been with her partner for 3 years. However, she mentioned that since her anxiety has increased, she's been withdrawing from social activities more often. "I just don't have the energy to be social after work," she said.

ASSESSMENT IMPRESSIONS:
Based on clinical interviews, review of submitted materials, and behavioral observations, presenting concerns are consistent with Generalized Anxiety Disorder (GAD) with work-related features. Client meets criteria including:

- Excessive worry occurring more days than not for at least 6 months
- Difficulty controlling worry
- Associated symptoms: restlessness, fatigue, difficulty concentrating, irritability, muscle tension, sleep disturbance
- Symptoms cause clinically significant distress and impairment in occupational functioning

There are also features consistent with workplace burnout including:
- Emotional exhaustion related to job demands
- Depersonalization/cynicism (the "why bother" attitude starting to emerge)
- Reduced professional efficacy (decreasing confidence in abilities)

Note: Client specifically requested information about anxiety management techniques during our session, indicating good insight and motivation for treatment.

RECOMMENDATIONS FROM THIS SESSION:
1. Consider psychiatric evaluation for possible medication trial - SSRIs are typically first-line for GAD
2. Continue individual therapy focusing on:
   - Cognitive-behavioral techniques for anxiety management
   - Workplace boundary setting
   - Assertiveness training
3. Explore workplace accommodations if symptoms significantly impair function
4. Consider evaluation for possible FMLA leave if symptoms warrant
5. Follow up with PCP regarding physical health given anxiety presentation
6. Encourage continued exercise and social engagement despite low motivation

Client and I discussed these recommendations and she agreed to think about medication, stating she'd prefer to try therapy first but is open to the idea. She was receptive to the workplace suggestions and wants to work on boundary-setting skills. 

We discussed possibly using the upcoming vacation as a test run for true rest and disconnection. She laughed and said "that will be my real test."

NEXT STEPS:
- Client to schedule follow-up in 2 weeks (March 29, 2024)
- Client to consider contacting psychiatrist (will provide referral list)
- Client to journal about workplace situations that trigger most anxiety
- Next session to focus on grounding techniques and initial cognitive restructuring

---

ADDITIONAL NOTES - Follow-up phone call March 8, 2024:
Left message for client confirming next appointment. Received text back same day confirming. She also asked if she should tell her manager about her anxiety. Discussed pros and cons in brief text exchange and suggested she think about it and we can discuss in next session.

She also mentioned she's started doing some deep breathing exercises she found online and they're "kind of helping." Good sign of engagement.

---

FINANCIAL: Client has insurance through employer (Blue Cross Blue Shield). Session covered under mental health benefits with $30 copay. Will need to check if psychiatric referral is in network.

File to be updated following next session.
`;

// Structured presentation template for extraction output
export const TEST_DESIRED_FORMAT = `# [Individual Name] - Case Report

## Executive Summary
[Brief summary of the individual, key presenting concerns, and primary recommendations. 2-3 sentences maximum.]

## Background Information

### Demographics
- **Name:**
- **Age:**
- **Occupation:**
- **Referral Source:**
- **Referral Date:**
- **Assessment Date:**

### Contact Information
- **Primary Phone:**
- **Emergency Contact:**
- **Insurance Provider:**

## History

### Education
- List educational background chronologically
- Include degrees, institutions, and dates

### Employment
- Current employer and position
- Relevant employment history
- Employment concerns or notes

### Family
- Immediate family members
- Relevant family information for context

## Presenting Concerns
[Main issues and why the individual is seeking services]

### Presenting Problem
[Detailed description of the primary concern]

### Duration and Onset
[When did concerns begin and what precipitated them]

### Impact on Daily Functioning
[How issues affect work, relationships, daily life]

## Assessment Findings

### Mental Status Examination
[Behavioral observations from session]

### Diagnostic Impressions
[Any diagnoses or clinical impressions]

### Relevant History
[Past treatment, hospitalizations, medications, etc.]

## Recommendations

### Immediate Actions
1. [Urgent or immediate next steps]

### Treatment Planning
1. [Therapeutic interventions recommended]
2. [Specific approaches to address concerns]

### Referrals
- [Any specialist referrals needed]
- [Medical referrals needed]

### Resources and Support
- [Community resources]
- [Support systems to engage]

## Action Items
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

## Next Steps
- **Next Appointment:**
- **Homework/Assignments:**
- **Items to Follow Up:**

## Additional Notes
[Any other relevant information, administrative notes, or follow-up items]
`;
