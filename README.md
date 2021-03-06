# [RedditNotifer](https://addons.mozilla.org/en-US/firefox/addon/redditnotifier-WE/) (v3.0.0) <img src="https://raw.githubusercontent.com/Druce/RedditNotifier-WE/master/data/icon-logo.png" alt="Icon" align="right" height="48"/>

A simple addon for Firefox that alerts you to new unread messages on [reddit](http://reddit.com/).

This addon is written with the Firefox [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions) and builds on the original RedditNotifier code by Bradley Rosenfeld.

## Features

- Toolbar button to allow easy access to your reddit inbox.
- Notifications (can be turned off) when you have new messages or moderator mail.
- Watch your favorite subreddit for new posts.
- Plays a sound when there are new messages (can be turned off).
- A persistent bubble on the toolbar button that tells you exactly how many messages you have.
- Panel to quickly view and open unread messages and subreddits.
- Restartless; just install and you're ready to go!
- Doesn't store login credentials. Just log into reddit like you normally would.
- Customizable refresh time (10 seconds to infinity).

## CAUTION

This add-on DOES NOT work if Firefox built-in "Tracking Protection" (under Preference->Privacy & Security) is turned on. I don't know any way around this so it is unlikely to be fixed.

## Development

Install web-ext

```bash
$ npm install --global web-ext
```

From the root project directory, run web-ext

```bash
$ web-ext run
```

## How can I help?

- [Report issues](https://github.com/Druco/RedditNotifier-WE/issues).
- Help with active development. [Submit a pull request](https://github.com/Druce/RedditNotifier-WE/pulls).

### License
Licensed under the [Mozilla Public License version 2.0](https://www.mozilla.org/MPL/2.0/)

A project by Druco.
