# Echo360 Lightning

Echo360 Lightning is a browser extension that entirely replaces the UI on echo360.net.au with a minimal React/TypeScript interface that does not need to support everything, but provides a happy path to watching lectures efficiently, and allows the user to switch it off to view the old Echo360 experience. 

Once crucial requirement is the Echo360 experience is usually a resource hog. As such, it should *not* be running in the background. This is utterly crucical. 

This replacement experience does not replace Echo360's login and auth. Lightning is opt-in and per tab.

## User story

- Open Echo360 normally, complete the institution/SSO flow. Lightning is disabled at this stage.
- Clicking the toolbar icon engages Echo360 Lightning, it replaces the UI wholesale. The old UI no longer runs at all. Ideally, no Echo360 JavaScript runs by this point.
- The user can see their courses. The ones in the current term appear first (either by sorting or otherwise).
- The user can click on a course and view the lectures associated with it. They can see which ones they have played, and how far through they might be.
- The user can click on a lecture, it will play or resume from where they left off. There is a multi camera experience where the user can add or remove streams from the UI as they please. 1, 2, 3 streams it doesn't matter. They can move them around and resize them as they please.

We will not strive support content that is protected by Echo360 DRM, any support is incidental.
