# User testing kit (Week 8)

Nigel's advice (Nov 19 office hours): test with friends and other people outside the team, fix the bugs they find, and make the experience smoother. This kit lets each of us run the same short session so the results can be compared.

**Before each session:** open the live link and let the tester sign in themselves with the account for their task (the accounts are under **Demo accounts** on the sign-in page; the password is **Demo2026!**). Signing in is part of the test: note anything that confuses them.

**Goal:** each team member tests with **at least 2 people** by **Nov 22**. Log every problem in Jira (one ticket per problem) by the end of that day.

## Before the session (2 minutes)

1. Open the app (live link, or `npm run dev`) and press **Reset demo** in the dark strip at the top.
2. Tell the person: "We're testing the app, not you. Think out loud. If you get stuck, that's useful for us."
3. Don't help unless they've been stuck for a minute. Write down where they hesitate.

## Tasks (about 15 minutes)

Read each task out loud. Don't name the button they should press.

| # | Viewing as | Task | They succeeded if they… |
| --- | --- | --- | --- |
| 1 | (first visit) | "You've just moved to Olde Riverside. Join as a resident." | Reach the map through the Welcome page |
| 2 | Resident | "There's a broken streetlight near the pharmacy. Tell the City, but only the City should see it." | Send a report with **Send privately** |
| 3 | Resident | "There's a pothole near Maple & Rye Diner. Report it." | Notice it's already reported and click **Support this instead** |
| 4 | Resident | "Find out what's happening with the problems you reported." | Open **Requests** and read the steps |
| 5 | Maya R. | "The City says your crosswalk is fixed. Tell them if you agree." | Answer **Was it fixed?** |
| 6 | Resident | "Find a free item near you and ask the person about it." | Use **Marketplace**, **Free only**, then **Message the seller** |
| 7 | Resident | "Someone sent you a message that looks like a scam. Deal with it." | **Report** or **Block** in Chats |
| 8 | Priya Nair | "Your group wants to hold an event in Thompson Parkette. Set it up." | Create the event and upload a permit |
| 9 | Jordan Lee | "You work for the City. Which request should you deal with first, and hand it to Sam?" | Use **Overdue** or sort, then **Assign** |
| 10 | Resident | "You don't want alerts about roadwork any more." | Turn off **Area alerts** in **Your profile** |
| 11 | (phone) | Show a QR poster on a laptop screen: "You see this sign on a lamp post. The light above it is broken." (needs the live link) | Scan, then send the report with the place already chosen |
| 12 | Resident | "Report the problem by just describing it." | Type it in **Describe it in your own words** and press **Use this** |
| 13 | (French speaker) | "Use the app in French and report a problem." | Switch to **FR** and send a report |

## After the session (3 minutes)

Ask, and write down the answers word for word:

1. "What was the most confusing moment?"
2. "Was there anything you expected to find but couldn't?"
3. "On a scale of 1 to 5, how easy was it overall?"
4. "Would you use this for your own street? Why or why not?"

## Logging problems in Jira

One ticket per problem, titled with what the person tried to do, for example **"Tester couldn't find how to make a report private"**.

- **Where:** the page and the user type
- **What happened:** what they did, and what they expected
- **How bad:** Blocker (couldn't finish) / Slowed them down / Small (wording, looks)
- **Owner:** whoever built that screen (see "Who built what" in the README)

Fix the blockers first, then whatever slowed people down most often.

## Results table (fill in)

| Tester | Date | Tested by | Tasks finished (of 10) | Ease (1–5) | Top problem |
| --- | --- | --- | --- | --- | --- |
| | | | | | |
| | | | | | |
