# "Counsellor" is now "Mentor" everywhere in the app

Extract into the project root (`mentorship-plus`) and choose **Replace**. Only wording changes: no new packages and
no database changes.

## What changed
- **Every visible word:** screens, buttons, messages and the help page now say **Mentor** / **mentors** instead of
  counsellor. For example, "Speak to a mentor", "Rate your mentor", "Invite a mentor", "Make mentor" and the
  "Mentor workspace".
- **Server messages:** notifications, error messages, the invitation email and the WhatsApp invitation text say
  mentor too.
- **Admin screens:** the accounts list shows the role as "Mentor" (it used to show COUNSELLOR), and the audit trail
  reads "MENTOR ..." as well.

## What deliberately stays the same (people never see these)
The account role stored in the database (COUNSELLOR), screen addresses (such as `counsellor-invite`), server
addresses (such as `/admin/counsellors/...`) and names inside the code are unchanged. Renaming those would break
existing accounts, invitation links already sent, and older copies of the app. Words about the activity, such as
"Counselling" (an admin section) and "counselling topics", are also unchanged.

## Apply
1. Extract the ZIP and choose Replace.
2. Run `npx expo start -c`.
3. Deploy the API so server messages and emails use the new word. There are no migrations.
4. Run `eas update --channel preview --message "Counsellor renamed to Mentor"`.
