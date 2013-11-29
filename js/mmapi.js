/*jslint browser:true*/
var MMApi = {
	apiUrl: "http://cohen.url.ph/sscripts",
	portfolioCallback: undefined,
	codeMap: {
		"0": "NB", "1": "VC", "2": "XW", "3": "ML", "4": "KJ", "5": "HG", "6": "FP", "7": "UY", "8": "TR", "9": "EZA"
	},
	encodeId: function (id) {
		"use strict";
		var i, res = "", bucket, bucketIndex;
		for (i = 0; i < id.toString().length; i += 1) {
			bucket = this.codeMap[id.toString()[i]];
			bucketIndex = Math.floor(Math.random() * bucket.length);
			res += bucket[bucketIndex];
		}
		return res;
	},
	decodeId: function (code) {
		"use strict";
		var i, res = "", key, ucode = code.toUpperCase();
		for (i = 0; i < ucode.length; i += 1) {
			for (key in this.codeMap) {
				if (this.codeMap.hasOwnProperty(key) && this.codeMap[key].indexOf(ucode[i]) >= 0) {
					res += key;
				}
			}
		}
		return res;
	},
	setPortfolio: function (data, callback) {
		"use strict";
		var xhr = new window.XMLHttpRequest(),
			postData = {"data": data};
		xhr.open("POST", this.apiUrl + "/portfolio.php?nocache=" + (new Date()).getTime().toString(), true);
		xhr.onreadystatechange = function () {
			var resObj;
			if (typeof callback === "function") {
				if (xhr.readyState === 4) {
					if (xhr.status === 200) {
						resObj = JSON.parse(xhr.responseText);
						if (resObj && resObj.data && resObj.data.portfolioId) {
							callback(resObj.data.portfolioId);
						} else {
							callback(false);
						}
					} else {
						callback(false);
					}
				}
			}
		};
		xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
		xhr.send(JSON.stringify(postData));
	},
	getPortfolio: function (id, callback) {
		"use strict";
		var script = document.createElement("script");
		this.portfolioCallback = callback;
		script.setAttribute("src", this.apiUrl + "/portfolio.php?id=" + id + "&callback=MMApi.portfolioCallback&nocache=" + (new Date()).getTime().toString());
		document.getElementsByTagName("head")[0].appendChild(script);
	}
};