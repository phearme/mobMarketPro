/*jslint browser:true*/
var YAHOO = {
	searchCallback: undefined,
	//searchUrl: "http://autoc.finance.yahoo.com/autoc?callback=YAHOO.Finance.SymbolSuggest.ssCallback",
    searchUrl: "https://s.yimg.com/aq/autoc?region=US&lang=en-US&callback=YAHOO.Finance.SymbolSuggest.ssCallback",
	search: function (searchString, callback) {
		"use strict";
		var url = this.searchUrl + "&query=" + window.escape(searchString).replace("%27", ";")
				+ "&nocache=" + (new Date()).getTime().toString(),
			script = document.createElement("script");
		this.searchCallback = callback;
		script.setAttribute("src", url);
		document.getElementsByTagName("head")[0].appendChild(script);
	},
	Finance: { SymbolSuggest: { ssCallback: function (data) {
		"use strict";
		if (typeof YAHOO.searchCallback === "function") {
			if (data.ResultSet && data.ResultSet.Result) {
				YAHOO.searchCallback(data.ResultSet.Result);
			}
		}
	}}}
};
