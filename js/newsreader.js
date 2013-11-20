/*global XMLHttpRequest*/
var NewsReader = (function () {
	"use strict";

	function NewsReader() {
		this.rssUrl = "https://news.google.com/news/feeds?pz=1&cf=all&output=rss";
	}

	NewsReader.prototype._getNodeValue = function (xmlNode, tagName) {
		var returnValue,
			node = xmlNode.getElementsByTagName(tagName);
		if (node && node.length > 0) { returnValue = node[0].textContent; }
		return returnValue;
	};

	NewsReader.prototype.NewsModel = function (title, link, pubDate, image, content) {
		return {
			title: title,
			link: link,
			pubDate: pubDate,
			image: image,
			content: content
		};
	};

	NewsReader.prototype.getNews = function (search, callback) {
		var xhr = new XMLHttpRequest(),
			url = this.rssUrl + "&nocache=" + (new Date()).getTime().toString(),
			self = this;
		url += search ? "&q=" + search : "&topic=b";
		xhr.open("GET", url, true);
		xhr.onreadystatechange = function () {
			var data, itemNodes, items = [], i, j,
				item, description, parsedDesc, descImages, descFonts, fontTagOccurance;
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					data = (new window.DOMParser()).parseFromString(xhr.responseText, "text/xml");
					console.log(data);
					itemNodes = data.getElementsByTagName("item");
					if (itemNodes && itemNodes.length > 0) {
						for (i = 0; i < itemNodes.length; i += 1) {
							item = self.NewsModel(
								self._getNodeValue(itemNodes[i], "title"),
								self._getNodeValue(itemNodes[i], "link"),
								self._getNodeValue(itemNodes[i], "pubDate")
							);
							description = itemNodes[i].getElementsByTagName("description");
							if (description && description.length > 0) {
								parsedDesc = (new window.DOMParser()).parseFromString(description[0].textContent, "text/xml");
								descImages = parsedDesc.getElementsByTagName("img");
								if (descImages && descImages.length > 0) {
									for (j = 0; j < descImages.length; j += 1) {
										if (descImages[j].getAttribute("src") && descImages[j].getAttribute("src") !== "") {
											item.image = descImages[j].getAttribute("src");
											break;
										}
									}
								}
								descFonts = parsedDesc.getElementsByTagName("font");
								if (descFonts && descFonts.length > 0) {
									fontTagOccurance = 0;
									for (j = 0; j < descFonts.length; j += 1) {
										if (descFonts[j].getAttribute("size") === "-1") {
											fontTagOccurance += 1;
											if (fontTagOccurance === 2) {
												if (descFonts[j].textContent.length > 0) {
													item.content = descFonts[j].textContent;
												}
												break;
											}
										}
									}
								}
							}
							items.push(item);
						}
						callback(items);
					} else {
						callback(false);
					}
				} else {
					callback(false);
				}
			}
		};
		xhr.send(null);
	};

	return NewsReader;
}());