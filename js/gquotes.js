/*jslint browser:true*/
var GQuotes = {
	historyCallback: undefined,
	quotesCallback: undefined,
	quotesUrl: "http://finance.google.com/finance/info?client=ig",
	getQuote: function (symbols, callback) {
		"use strict";
		var url = this.quotesUrl + "&callback=GQuotes.quotesCallback&nocache=" + (new Date()).getTime().toString() + "&q=",
			i,
			script = document.createElement("script");
		for (i = 0; i < symbols.length; i += 1) {
			url += i === 0 ? symbols[i].replace("^", ".") : "," + symbols[i].replace("^", ".");
		}
		this.quotesCallback = callback;
		script.setAttribute("src", url);
		document.getElementsByTagName("head")[0].appendChild(script);
	}
};