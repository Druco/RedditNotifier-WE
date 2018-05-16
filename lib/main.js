/*
 * RedditNotifier
 * Displays messages and unread counts for reddit
 * version 3.0.0
 */

"use strict";

var config = {
	debug: true,
	name: "RedditNotifier",
	popup: "data/panel/panel.html",
	urls: {
		reddit: "https://www.reddit.com/",
		unreadMessage: "https://www.reddit.com/message/unread/",
		unreadModerator: "https://www.reddit.com/message/moderator/unread/",
		login: "https://ssl.reddit.com/login",
		install: "https://boringcode.github.io/RedditNotifier",
		newPosts: "https://www.reddit.com/r/%x%/new/",
		newPostsJSON: "https://www.reddit.com/r/%x%/new.json",
	},
	unreadURLS: {
        "messages": {
		    "json": "https://www.reddit.com/message/unread.json",
			"type": "unreadMessage",
			"message": "%d new message(s)",
			"format": {
				data: { children: "count" }
			},
			"unread": 0,
			"lastChecked": -1,
			"action": "https://www.reddit.com/message/unread/"
		},
        "moderator": {
		    "json": "https://www.reddit.com/message/moderator/unread.json",
			"type": "unreadModerator",
			"message": "%d new moderator mail message(s)",
			"format": {
				data: { children: "count" }
			},
			"unread": 0,
			"lastChecked": -1,
			"action": "https://www.reddit.com/message/moderator/unread/"
		}
	},
    subredditProto: {
		"json": "https://www.reddit.com/r/%x%/new.json",
		"type": "subreddit",
		"message": "%d new post(s) in %x%",
		"format": {
			data: { children: "created_utc" }
		},
		"unread": 0,
		"lastChecked": -1,
		"action": "https://www.reddit.com/r/%x%/new/",
	},
	ignore: [],
    checkMessages: false,
	messages: {
		newPosts: "There are new posts in: /r/%x%",
		loggedOut: "It looks like you are logged out of Reddit.\nTry logging in."
	},
    checkModerator: false,
    invertIcon: false,
    //multiplied by 1000 to get seconds, minus to 1000 to take into account delay when loading new data
	refreshTime: 30,
	forceShow: true,
	delayLoad: 5000,
	// Seconds to display notification
	notifyTimeout: 5,
    enableNotification: true,
	icons: {
		default: {
			"16": "data/icon/default/icon-16.png",
			"32": "data/icon/default/icon-32.png",
			"64": "data/icon/default/icon-64.png",
		},
		defaultDark: {
			"16": "data/icon/default-dark/icon-16.png",
			"32": "data/icon/default-dark/icon-32.png",
			"64": "data/icon/default-dark/icon-64.png",
		},
		reload: {
			"16": "data/icon/reload/icon-16.png",
			"32": "data/icon/reload/icon-32.png",
			"64": "data/icon/reload/icon-64.png",
		},
		unread: {
			"16": "data/icon/unread/icon-16.png",
			"32": "data/icon/unread/icon-32.png",
			"64": "data/icon/unread/icon-64.png",
		},
		logo: "icon-logo.png"
	},
	alert: "alert.wav",
    enableAlert: false,
	volume: 100,
};

var RedditNotifier = function() {
	var self = this;

	self.timer = null;
    self.urls = {};
	self.messages = [];

	self.notifier = new Notify(config.name, config.notifyTimeout);

	var clickButton = function() {
		log("Clicked button");
		if (self.messages.length === 0) {
			openTab({ action: config.urls.reddit });
		} else {
			openTab(self.messages[0]);
		}
	};

	var updateButton = function(state = "default") {
		var button = browser.browserAction, unread, tooltip;

		unread = sum(self.urls, "unread");
		// Empty string clears badge
		button.setBadgeText({
			"text": (unread === 0) ? "" : unread.toString()
		});		

		// Automatically set state to unread if unread count is greater than 0
		if (state === "default") {
                if (unread > 0) {
                    state = "unread";
                } else if (config.invertIcon == true) {
                    state = "defaultDark";
                }
        }


		// Set icon based upon state
		button.setIcon({
			"path": (state in config.icons) ? config.icons[state] : config.icons["default"]
		});

		// Join tooltip array with line breaks
		tooltip = (self.messages.length > 0) ? self.messages.join("\n") : config.name;
		button.setTitle({
			"title": tooltip
		});

		// Set popup if there is more than 1 message
		button.setPopup({
			popup: (self.messages.length > 1) ? config.popup : ""
		});
	}

    var clearUnread = function(jsonUrl) {
        // Find the appropriate URL object
        for (var key in self.urls) {
            if (self.urls[key].json == jsonUrl) {
                // Reset unread count
                self.urls[key].unread = 0;
                // Update last checked time to now. Divide by 1000 because
                // Date.now() returns msec and reddit created_utc appears
                // to be in seconds.
                self.urls[key].lastChecked = Date.now() / 1000.0;
                // Store the time to local storage for use on restart
                var obj = {};
                obj[key + "_time"] = self.urls[key].lastChecked;
                browser.storage.local.set(obj);
                break;
            }
        }
    }
 
	var openTab = function(action) {
		if (!("action" in action)) return;
		browser.tabs.create({
			url: action["action"]
		}).then(function() {
			log("Opened tab");
			// Reset unread count
			if ("id" in action) {
                clearUnread(action.id);
				// Remove from messages
				var index = self.messages.indexOf(action);
                self.messages.splice(index, 1);
			}
			updateButton();
		})
	}

	var unread = function(results = []) {
		var i, result, url, response, unread, message;
		var totalUnread = 0, notify = [];
        var sane;

		// Reset messages (we rebuild this array with the new results, slightly inefficient but meh)
		self.messages = [];

		// Loop through each request object
		for (i = 0; i < results.length; i++) {
			result = results[i];

			// Sanity check
            sane = false;
            for (var key in self.urls) {
                if (self.urls[key].json == result["url"]) {
                    url = self.urls[key];
                    sane = true;
                    break;
                }
            }
            
			if (!sane) continue;
			
			// Get total unread count for this response
			unread = countUnread(result["response"], url["format"], url["lastChecked"]);
			// Add new message to display in panel (or in notification)
			if (unread > 0) {
				// Display message in panel
				self.messages.push(new Message({
					"id": result["url"],
					"message": sprintf(url["message"], unread),
					"action": url["action"],
					"notify": (unread > url["unread"]),
				}));
			}

			url["unread"] = unread;
		}

		// Notify user of new messages
		notify = self.messages.filter(function(message) {
			notify = message.notify === true; message.notify = false; return notify; 
		});
		if (notify.length > 0 && config.enableNotification) {
			self.notifier.create(config.icons["unread"]["64"], "New Messages", notify.join("\n"), function(id) {
				// I can't programmatically open the panel
				// so I'll open the first thing the user is notified about
				openTab(notify[0]);
			});	
		}
	}

	// Recursively count items in an object based on a search format
	var countUnread = function(data, format, time) {
		// Base case
		if (typeof(format) === "string") {
			var count;
			switch(format) {
				case "count":
					// Return the length of the array
					count = (typeof(data) === "object") ? data.length : 0;
					break;
				case "created_utc":
                    if (Array.isArray(data)) {
                        var arrayCnt = 0;
                        for (var i = 0; i < data.length; i++) {
                            arrayCnt += countUnread(data[i].data, format, time);
                        }
                        return arrayCnt;
                    } else {
                
					// Return 1 if timestamp is greater than the last checked time
					count = (format in data && data[format] >= time) ? 1 : 0;
                }
					break;
				default:
					count = 0;
			}
			return count;
		} else {
			// Sanity check
			if (typeof(data) !== "object") return 0;

			// Recursively find key I'm looking for
			// Format should only have one key
			for (var key in format) {
				// Can't find key in data, return count of 0
				if (!(key in data)) return 0;
				return countUnread(data[key], format[key], time);
			}
		}
	}

	var update = function() {
		var requests = [];
		var url, obj;
		log("Attempting update")
		// Set button to indicate refresh
		updateButton("reload");
		for (url in self.urls) {
			// User can disable checking this endpoint in settings
			requests.push(Request("GET", self.urls[url]))
		}
		Promise.all(requests).then(function(results) {
			unread(results);
			updateButton();
			// Update according to user configuration (in seconds)
			self.timer = setTimeout(update.bind(self), config.refreshTime * 1000);
		}).catch(function(error) {
			console.log(error);
			updateButton();
			// Wait 3 minutes before firing again (avoid pinging reddit's servers too much)
			self.timer = setTimeout(update.bind(self), 180 * 1000);
		})

        browser.runtime.sendMessage({type: "settingChange", setting: "subreddits", value: "printsf"});

	}

    var processSettingChange = function(message) {
        if ("setting" in message) {
            switch(message["setting"]) {
            case "showNotifications":
                config.enableNotification = message["value"];
                break;
            case "playAlert":
                config.enableAlert = message["value"];
                break;
            case "volume":
                config.volume = message["value"];
                break;
            case "timing":
                config.refreshTime = message["value"];
                break;
            case "subreddits":
                //Split subreddits on comma, trims each subreddit, and
                // then makes sure it is a valid subreddit
                var subreddits = message["value"].split(",").map(function(subreddit) {
                    return subreddit.trim();
                }).filter(function(subreddit) {
                    return (subreddit.match(/^[a-zA-Z0-9]+$/));
                });

                // Delete any subreddits that are no longer required
                for (var key in self.urls) {
                    if (subreddits.indexOf(key) == -1) {
                        delete self.urls[key];
                    }
                }

                // Add in any subreddits not currently in the list
                for (var i = 0; i < subreddits.length; i++) {
                    var key;
                    key = subreddits[i];
                    if (! (key in self.urls)) {
                        // Copy the prototype config structure
                        self.urls[key] = JSON.parse(JSON.stringify(config.subredditProto));
                        // Substitute the name of the subreddit into the strings
                        self.urls[key].json = self.urls[key].json.replace("%x%", key);
                        self.urls[key].action = self.urls[key].action.replace("%x%", key);
                        self.urls[key].message = self.urls[key].message.replace("%x%", key);
                        // If there is last checked time stored, insert it
                        var time_name = key + "_time";
                        var promise = browser.storage.local.get(time_name);
                        promise.then(function(result) {
                            if (Object.keys(result).length == 1) {
                                var time_key = Object.keys(result)[0];
                                var key = time_key.slice(0, time_key.lastIndexOf("_time"));
                                if (key.length != 0) {
                                    self.urls[key].lastChecked = result[time_key];
                                }
                            } // no else required because it will pick up the default from copying the proto
                        }, function(error) {
			                console.log(`Error: ${error}`);
		                });
                    }
                }
                break;
            case "unreadModerator":
                // If we want to check moderator messages and aren't doing it
                // now, add it into the urls to check
                if (message["value"] && self.urls["moderator"] == undefined) {
                    self.urls["moderator"] = config.unreadURLS["moderator"];
                } else if (!message["value"] && self.urls["moderator"] != undefined) {
                    delete self.urls["moderator"];
                }
                break;
            case "unreadMessage":
                // If we want to check messages and aren't doing it
                // now, add it into the urls to check
                if (message["value"] && self.urls["messages"] == undefined) {
                    self.urls["messages"] = config.unreadURLS["messages"];
                } else if (!message["value"] && self.urls["messages"] != undefined) {
                    delete self.urls["messages"];
                }
                break;
            case "invertIcon":
                // Use the defaultDark icons if the user specifies
                config.invertIcon = message["value"];
                break;
                
            default:
                log("Default case: \"" + message["setting"] + "\"");
                break;
            }
        }
    }


	/*
	 * Handle extension messaging with various background scripts
	 */
	var onMessage = function(message, sender, sendResponse) {
		var response;
		if (!("type" in message)) {
			sendResponse(false); 
			return;
		}
		switch(message["type"]) {
			case "getMessages":
				response = self.messages;
				break;
			case "openTab":
				if ("action" in message) {
					var action = self.messages.find(function(msg) { return message["action"] === msg["action"] });
					if (typeof(action) !== "undefined") {
						openTab(action);
						response = true;
						break;
					}
				}
            case "settingChange":
                processSettingChange(message);
                break;
			default:
				response = false;
		}
		if (response) sendResponse(response);
	}

    var getOrSetDefault = function(name, defValue) {
        var promise = browser.storage.local.get(name);
        promise.then(function(result) {
            if (name in result) {
                processSettingChange({type: "settingChange",
                                      setting: name,
                                      value: result[name]});
            } else {
                processSettingChange({type: "settingChange",
                                      setting: name,
                                      value: defValue});
                var obj = {};
                obj[name] = defValue;
                browser.storage.local.set(obj);
            }
        }, function(error) {
            processSettingChange({type: "settingChange",
                                  setting: name,
                                  value: defValue});
            var obj = {};
            obj[name] = defValue;
            browser.storage.local.set(obj);
			console.log(`Error: ${error}`);
		});
    }
                     

	var init = function() {
		log("Starting RedditNotifier");

        // Try to read the setup from local storage
        // If valid settings weren't available in local storage, start with defaults
        getOrSetDefault("showNotifications", false);
        getOrSetDefault("playAlert", true);
        getOrSetDefault("volume", 70);
        getOrSetDefault("timing", 30);
        getOrSetDefault("subreddits", "");
        getOrSetDefault("unreadModerator", false);
        getOrSetDefault("unreadMessage", false);
        getOrSetDefault("invertIcon", false);

		// Set up listeners
		browser.browserAction.onClicked.addListener(clickButton.bind(self));
		browser.runtime.onMessage.addListener(onMessage.bind(self));

		// Fetch data from reddit
		update();
    }

	return {
		init: init
	}
}

var main = new RedditNotifier();
main.init();
