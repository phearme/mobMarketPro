/*jslint browser:true*/
var YQuotes = {
	historyCallback: undefined,
	quotesCallback: undefined,
	quotesUrl: "http://query.yahooapis.com/v1/public/yql?format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys",
	getYQLDate: function (date) {
		"use strict";
		var y = date.getYear(),
			m = date.getMonth() + 1,
			d = date.getDate();
		y = y < 1000 ? y + 1900 : y;
		m = m < 10 ? "0" + m : m;
		d = d < 10 ? "0" + d : d;
		return y + "-" + m + "-" + d;
	},
	getQuote: function (symbols, callback) {
		"use strict";
		var url = this.quotesUrl + "&q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20in%20(",
			i,
			script = document.createElement("script");
		for (i = 0; i < symbols.length; i += 1) {
			url += i === 0 ? "\"" + symbols[i] + "\"" : ",\"" + symbols[i] + "\"";
		}
		url += ")&callback=YQuotes.quotesCallback&nocache=" + (new Date()).getTime().toString();
		this.quotesCallback = callback;
		script.setAttribute("src", url);
		document.getElementsByTagName("head")[0].appendChild(script);
	},
	getQuoteHistory: function (symbol, numDays, callback) {
		"use strict";
		var startDate = new Date(),
			endDate = new Date(),
			url = this.quotesUrl,
			script = document.createElement("script");
		startDate.setDate(endDate.getDate() - numDays);
		url += "&q=select%20*%20from%20yahoo.finance.historicaldata%20where%20symbol%20%3D%20%22" + symbol + "%22%20and%20startDate%20%3D%20%22" + this.getYQLDate(startDate) + "%22%20and%20endDate%20%3D%20%22" + this.getYQLDate(endDate) + "%22&callback=YQuotes.historyCallback&nocache=" + (new Date()).getTime().toString();
		this.historyCallback = callback;
		script.setAttribute("src", url);
		document.getElementsByTagName("head")[0].appendChild(script);
	}
};
