# Privacy Policy for Language Filter for YouTube

Last updated: August 19, 2026

Language Filter for YouTube helps language learners maintain immersion by
filtering YouTube recommendations that match languages they choose to exclude.
The extension performs its work locally in the user's browser.

## Information the extension handles

The extension temporarily reads visible video titles and channel names on
YouTube Home and Shorts pages. This website content is used only to detect a
language and apply the filtering behavior selected by the user. The content is
processed locally, is not retained, and is not sent to the developer or any
third party.

The extension stores the following preferences using `chrome.storage.local`:

- whether filtering is enabled;
- the languages selected by the user;
- the selected filtering mode; and
- whether channel names should also be checked.

These preferences remain on the user's device and can be changed through the
extension popup. Chrome removes the extension's local storage when the
extension is uninstalled.

For languages that cannot be identified reliably by their writing system, the
extension may use Chrome's built-in, on-device Language Detector API. Chrome
may download the language model required by that browser feature. The extension
does not send the analyzed text to an external service.

## Data collection, sharing, and use

Language Filter for YouTube does not collect analytics or telemetry, does not
create user accounts, and does not transmit, sell, or share user data. It does
not use user data for advertising, profiling, creditworthiness, lending, or any
purpose unrelated to its single purpose.

All website content handled by the extension is used only to provide the
language-filtering feature described above. No human has access to that
content.

## Permissions

The extension requests only the permissions needed for its single purpose:

- **Storage:** saves the user's extension preferences locally.
- **Access to `https://www.youtube.com/*`:** allows the extension to inspect
  visible recommendation titles and channel names and then hide matching items
  or activate YouTube's recommendation controls.

## Changes to this policy

If the extension's data practices change, this policy will be updated before
the revised version is published.

## Contact

Questions or concerns can be submitted through the project's public issue
tracker:

https://github.com/hsk-kr/language-filter-for-youtube/issues
