/*jslint browser:true*/
/*global console, angular, NewsReader, YAHOO, YQuotes, GQuotes, MMApi, google, $*/
var newsReader = new NewsReader(),
	mmapp = angular.module("mmapp", ["ngSanitize"]);

// main controller
mmapp.controller("mmCtrl", function mmCtrl($scope) {
	"use strict";
	var i;
	$scope.realTimeFrequency = 4500;
	window.debugScope = $scope;
	$scope.Math = window.Math;
	$scope.screens = [
		{id: "search", label: "Search Quote", inMainMenu: true},
		{id: "stockDetails", label: "", inMainMenu: false},
		{id: "news", label: "Financial News", inMainMenu: true},
		{id: "watchlist", label: "Watch List", inMainMenu: true},
		{id: "portfolio", label: "Portfolio", inMainMenu: true},
		{id: "chart", label: "", inMainMenu: false},
		{id: "backuprestore", label: "Backup • Restore", inMainMenu: true},
		{id: "backuprestorestatus", label: "Backup • Restore", inMainMenu: false},
		{id: "about", label: "About", inMainMenu: true}
	];
	$scope.chartLength = {
		"1w": 7,
		"1m": 30,
		"3m": 90,
		"6m": 180,
		"1y": 365
	};
	$scope.chartLengthOrdered = [];
	for (i in $scope.chartLength) {
		if ($scope.chartLength.hasOwnProperty(i)) {
			$scope.chartLengthOrdered.push({key: i, value: $scope.chartLength[i]});
		}
	}
	$scope.chartLengthOrdered.sort(function (a, b) {
		return a.value < b.value ? -1 : 1;
	});
	$scope.loading = false;
	$scope.selectedScreen = undefined;
	$scope.parentScreenId = undefined;
	$scope.selectedStock = undefined;
	$scope.newsItems = [];
	$scope.searchResults = [];
	$scope.searchStock = "";
	$scope.stockDetailsTimerOn = false;
	$scope.watchlistTimerOn = false;
	$scope.portfolioTimerOn = false;
	$scope.getQuoteTimeout = undefined;
	$scope.watchlistTimeout = undefined;
	$scope.portfolioTimeout = undefined;
	$scope.showExtended = false;
	$scope.selectedHistory = "1m";
	$scope.chartData = [[]];
	$scope.chart = undefined;
	$scope.watchlist = [];
	$scope.portfolio = [];
	$scope.portfolios = [];
	$scope.chooseQtyPtf = false;
	$scope.inputQty = 1;
	$scope.restoreCode = "";

	// secure apply (prevent "digest in progress" collision)
	$scope.safeApply = function (fn) {
		var phase = this.$root.$$phase;
		if (phase && (phase.toString() === "$apply" || phase.toString() === "$digest")) {
			if (typeof fn === "function") { fn(); }
		} else {
			this.$apply(fn);
		}
	};

	$scope.sortWatchList = function () {
		$scope.watchlist.sort(function (a, b) {
			return a.name > b.name;
		});
	};

	$scope.sortPortfolio = function () {
		$scope.portfolio.sort(function (a, b) {
			return a.name > b.name;
		});
	};

	$scope.getPtfTitleValue = function (stock) {
		var last = 0;
		if (stock && stock.stockData && stock.stockData.LastTradePriceOnly) {
			last = stock.stockData.LastTradePriceOnly;
			while (last.indexOf(",") >= 0) {
				last = last.replace(",", "");
			}
		}
		return stock.quantity * window.parseFloat(last);
	};

	$scope.getPtfValue = function () {
		var total = 0;
		$scope.portfolio.forEach(function (s) {
			total += $scope.getPtfTitleValue(s);
		});
		return total;
	};

	// external links in default browser
	$scope.openLink = function (link) {
		window.open(link, "_system");
	};

	// simple screen navigation helpers
	$scope.selectScreen = function (s, preserveContext) {
		var newsSearch;
		if (!s || s === "") {
			$scope.selectedScreen = $scope.selectedStock = undefined;
		} else {
			$scope.selectedScreen = typeof s === "string" ? JSON.parse(s) : s;
			switch ($scope.selectedScreen.id) {
			case "news":
				$scope.loading = true;
				newsSearch = $scope.selectedStock ? $scope.selectedStock.name : undefined;
				newsReader.getNews(newsSearch, function (items) {
					$scope.safeApply(function () { $scope.loading = false; });
					if (items && items.length > 0) {
						$scope.safeApply(function () { $scope.newsItems = items; });
					}
				});
				break;
			case "search":
				$scope.parentScreenId = "search";
				if (!preserveContext) {
					$scope.safeApply(function () {
						$scope.searchStock = "";
						$scope.searchResults = [];
					});
				}
				break;
			case "watchlist":
				$scope.parentScreenId = "watchlist";
				if ($scope.watchlist.length > 0) {
					$scope.loading = true;
				}
				$scope.watchlistTimerOn = true;
				$scope.fetchWatchListData();
				break;
			case "portfolio":
				$scope.parentScreenId = "portfolio";
				if ($scope.portfolio.length > 0) {
					$scope.loading = true;
				}
				$scope.portfolioTimerOn = true;
				$scope.fetchPortfolioData();
				break;
			}
		}
		if (!$scope.selectedScreen || ($scope.selectedScreen.id !== "stockDetails")) {
			window.clearTimeout($scope.getQuoteTimeout);
			$scope.getQuoteTimeout = undefined;
			$scope.stockDetailsTimerOn = false;
		}
	};

	$scope.selectScreenById = function (id, preserveContext) {
		$scope.screens.filter(function (s) {
			return s.id === id;
		}).forEach(function (s) {
			$scope.selectScreen(s, preserveContext);
			return;
		});
	};

	$scope.goBack = function (f) {
		if (!f) {
			$scope.selectScreen(undefined);
			return;
		}
		var from = typeof f === "string" ? JSON.parse(f) : f;
		$scope.loading = false;
		switch (from.id) {
		case "stockDetails":
			if ($scope.parentScreenId === "watchlist" || $scope.parentScreenId === "portfolio") {
				$scope.selectScreenById($scope.parentScreenId);
			} else if ($scope.parentScreenId === "search") {
				$scope.selectScreenById($scope.parentScreenId, true);
			} else {
				$scope.selectScreen(undefined);
			}
			break;
		case "chart":
			$scope.selectStock($scope.selectedStock);
			break;
		case "news":
			if ($scope.selectedStock) {
				$scope.selectStock($scope.selectedStock);
			} else {
				$scope.selectScreen(undefined);
			}
			break;
		case "watchlist":
			console.log("clearing watchlist timeout");
			window.clearTimeout($scope.watchlistTimeout);
			$scope.watchlistTimeout = undefined;
			$scope.watchlistTimerOn = false;
			$scope.selectScreen(undefined);
			break;
		case "portfolio":
			console.log("clearing portfolio timeout");
			window.clearTimeout($scope.portfolioTimeout);
			$scope.portfolioTimeout = undefined;
			$scope.portfolioTimerOn = false;
			$scope.selectScreen(undefined);
			break;
		case "search":
		case "backuprestore":
		case "backuprestorestatus":
		case "about":
			$scope.selectScreen(undefined);
			break;
		}
	};

	// starts up fetching quotes data and set refresh frequency
	$scope.fetchQuoteData = function () {
		if ($scope.stockDetailsTimerOn) {
			YQuotes.getQuote([$scope.selectedStock.symbol], function (data) {
				console.log("data.query.count: ", data.query.count);
				if (data && data.query && data.query.results && data.query.results.quote && $scope.selectedStock) {
					$scope.safeApply(function () {
						$scope.selectedStock.stockData = data.query.results.quote;
						$scope.loading = false;
						console.log($scope.selectedStock.stockData);
					});
				} else if (data && data.query && data.query.count === 0) {
					// y! may be unavailable, try through google
					console.log("gquote call");
					GQuotes.getQuote([$scope.selectedStock.symbol], function (data) {
						if (data && data.length && data.length > 0) {
							$scope.safeApply(function () {
								$scope.selectedStock.stockData = {
									ChangeRealtime: data[0].c,
									LastTradePriceOnly: data[0].l,
									ChangeinPercent: data[0].cp + "%",
									LastTradeTime: data[0].ltt
								};
								$scope.loading = false;
								console.log($scope.selectedStock.stockData);
							});
						}
					});
				}
			});
			$scope.safeApply(function () {
				$scope.getQuoteTimeout = window.setTimeout($scope.fetchQuoteData, $scope.realTimeFrequency);
			});
		}
	};

	// fetches quotes data for watchlist
	$scope.fetchWatchListData = function () {
		var watchlistSymbols = [], i;
		if ($scope.watchlistTimerOn) {
			for (i = 0; i < $scope.watchlist.length; i += 1) {
				watchlistSymbols.push($scope.watchlist[i].symbol);
			}
			if (watchlistSymbols.length > 0) {
				YQuotes.getQuote(watchlistSymbols, function (data) {
					var j, k, missingDataSymbols = [];
					console.log(data);
					$scope.safeApply(function () {
						for (j = 0; j < $scope.watchlist.length; j += 1) {
							$scope.watchlist[j].dataFetched = false;
						}
					});
					if (data && data.query && data.query.count && data.query.results && data.query.results.quote) {
						$scope.safeApply(function () {
							if (data.query.count === 1) {
								for (j = 0; j < $scope.watchlist.length; j += 1) {
									if ($scope.watchlist[j].symbol === data.query.results.quote.symbol) {
										$scope.watchlist[j].stockData = data.query.results.quote;
										$scope.watchlist[j].dataFetched = true;
									}
								}
							} else if (data.query.count > 1) {
								for (k = 0; k < data.query.results.quote.length; k += 1) {
									for (j = 0; j < $scope.watchlist.length; j += 1) {
										if ($scope.watchlist[j].symbol === data.query.results.quote[k].symbol) {
											$scope.watchlist[j].stockData = data.query.results.quote[k];
											$scope.watchlist[j].dataFetched = true;
										}
									}
								}
							}
							$scope.loading = false;
						});
					}
					// check if some symbols weren't fecthed => get them through google
					for (j = 0; j < $scope.watchlist.length; j += 1) {
						if (!$scope.watchlist[j].dataFetched) {
							missingDataSymbols.push($scope.watchlist[j].symbol);
						}
					}
					if (missingDataSymbols.length > 0) {
						GQuotes.getQuote(missingDataSymbols, function (data) {
							if (data && data.length && data.length > 0) {
								$scope.safeApply(function () {
									for (k = 0; k < data.length; k += 1) {
										for (j = 0; j < $scope.watchlist.length; j += 1) {
											if ($scope.watchlist[j].symbol.replace("^", ".") === data[k].t) {
												$scope.watchlist[j].stockData = {
													ChangeRealtime: data[k].c,
													LastTradePriceOnly: data[k].l,
													ChangeinPercent: data[k].cp + "%",
													LastTradeTime: data[k].ltt
												};
											}
										}
									}
									$scope.loading = false;
								});
							}
						});
					}
				});
			}
			$scope.safeApply(function () {
				$scope.watchlistTimeout = window.setTimeout($scope.fetchWatchListData, $scope.realTimeFrequency);
			});
		}
	};

	// fecthes quotes data for portfolio
	$scope.fetchPortfolioData = function () {
		var ptfSymbols = [], i;
		if ($scope.portfolioTimerOn) {
			for (i = 0; i < $scope.portfolio.length; i += 1) {
				ptfSymbols.push($scope.portfolio[i].symbol);
			}
			if (ptfSymbols.length > 0) {
				YQuotes.getQuote(ptfSymbols, function (data) {
					var j, k, missingDataSymbols = [];
					console.log(data);
					$scope.safeApply(function () {
						for (j = 0; j < $scope.portfolio.length; j += 1) {
							$scope.portfolio[j].dataFetched = false;
						}
					});
					if (data && data.query && data.query.count && data.query.results && data.query.results.quote) {
						$scope.safeApply(function () {
							if (data.query.count === 1) {
								for (j = 0; j < $scope.portfolio.length; j += 1) {
									if ($scope.portfolio[j].symbol === data.query.results.quote.symbol) {
										$scope.portfolio[j].stockData = data.query.results.quote;
										$scope.portfolio[j].dataFetched = true;
									}
								}
							} else if (data.query.count > 1) {
								for (k = 0; k < data.query.results.quote.length; k += 1) {
									for (j = 0; j < $scope.portfolio.length; j += 1) {
										if ($scope.portfolio[j].symbol === data.query.results.quote[k].symbol) {
											$scope.portfolio[j].stockData = data.query.results.quote[k];
											$scope.portfolio[j].dataFetched = true;
										}
									}
								}
							}
							$scope.loading = false;
						});
					}
					// check if some symbols weren't fecthed => get them through google
					for (j = 0; j < $scope.portfolio.length; j += 1) {
						if (!$scope.portfolio[j].dataFetched) {
							missingDataSymbols.push($scope.portfolio[j].symbol);
						}
					}
					if (missingDataSymbols.length > 0) {
						GQuotes.getQuote(missingDataSymbols, function (data) {
							if (data && data.length && data.length > 0) {
								$scope.safeApply(function () {
									for (k = 0; k < data.length; k += 1) {
										for (j = 0; j < $scope.portfolio.length; j += 1) {
											if ($scope.portfolio[j].symbol.replace("^", ".") === data[k].t) {
												$scope.portfolio[j].stockData = {
													ChangeRealtime: data[k].c,
													LastTradePriceOnly: data[k].l,
													ChangeinPercent: data[k].cp + "%",
													LastTradeTime: data[k].ltt
												};
											}
										}
									}
									$scope.loading = false;
								});
							}
						});
					}
				});
			}
			$scope.safeApply(function () {
				$scope.portfolioTimeout = window.setTimeout($scope.fetchPortfolioData, $scope.realTimeFrequency);
			});
		}
	};

	// opens up the detail stock screen and starts up fetching quotes data
	$scope.selectStock = function (stock) {
		if (!stock) {
			$scope.selectedScreen = undefined;
			return;
		}
		$scope.loading = true;
		$scope.selectedStock = typeof stock === "string" ? JSON.parse(stock) : stock;
		// fetch quotes
		$scope.stockDetailsTimerOn = true;
		$scope.fetchQuoteData();

		// show details screen
		$scope.chooseQtyPtf = false;
		$scope.selectScreenById("stockDetails");
	};

	// triggered when search quote has changed
	$scope.searchChange = function () {
		if ($scope.searchStock !== "") {
			YAHOO.search($scope.searchStock, function (data) {
				$scope.safeApply(function () {
					$scope.searchResults = data || [];
				});
			});
		} else {
			$scope.safeApply(function () { $scope.searchResults = []; });
		}
	};

	$scope.fetchHistoryData = function () {
		$scope.safeApply(function () {
			$scope.chartData = [[]];
		});
		if ($scope.selectedStock) {
			YQuotes.getQuoteHistory($scope.selectedStock.symbol, $scope.chartLength[$scope.selectedHistory], function (data) {
				console.log(data);
				var chartData = [[]],
					i,
					tick,
					dateTab;
				if (data && data.query && data.query.results && data.query.results.quote) {
					for (i = 0; i < data.query.results.quote.length; i += 1) {
						tick = data.query.results.quote[i];
						dateTab = tick.Date ? tick.Date.split("-") : tick.col0.split("-");
						chartData.push([new Date(dateTab[0], dateTab[1] - 1, dateTab[2]).getTime(), window.parseFloat(tick.Close || tick.col1)]);
					}
					$scope.safeApply(function () {
						$scope.chartData = chartData;
						$scope.loading = false;
					});
				} else {
					// try again
					$scope.fetchHistoryData();
				}
			});
		}
	};

	$scope.isInWatchList = function (symbol) {
		var i;
		for (i = 0; i < $scope.watchlist.length; i += 1) {
			if ($scope.watchlist[i].symbol === symbol) {
				return true;
			}
		}
		return false;
	};

	$scope.isInPortfolio = function (symbol) {
		var i;
		for (i = 0; i < $scope.portfolio.length; i += 1) {
			if ($scope.portfolio[i].symbol === symbol) {
				return true;
			}
		}
		return false;
	};

	$scope.addToPtf = function (action) {
		var quantity, floatQty;
		if (action === "cancel") {
			$scope.chooseQtyPtf = false;
			return;
		}
		if (action === "ok") {
			quantity = $scope.inputQty;
			floatQty = window.parseFloat(quantity);
			if (floatQty) {
				$scope.safeApply(function () {
					$scope.selectedStock.quantity = floatQty;
					$scope.portfolio.push($scope.selectedStock);
					$scope.sortPortfolio();
				});
				window.localStorage.setItem("portfolio", JSON.stringify($scope.portfolio));
				$scope.chooseQtyPtf = false;
				$scope.selectScreenById("portfolio");
			}
		}
	};

	$scope.selectedStockAction = function (action) {
		var i;
		switch (action) {
		case "chart":
			$scope.loading = true;
			$scope.fetchHistoryData();
			$scope.selectScreenById(action);
			break;
		case "news":
			$scope.selectScreenById(action);
			break;
		case "watchlist":
			if ($scope.isInWatchList($scope.selectedStock.symbol)) {
				$scope.safeApply(function () {
					i = $scope.watchlist.length - 1;
					while (i >= 0) {
						if ($scope.watchlist[i].symbol === $scope.selectedStock.symbol) {
							$scope.watchlist.splice(i, 1);
						}
						i -= 1;
					}
				});
			} else {
				$scope.safeApply(function () {
					$scope.watchlist.push($scope.selectedStock);
					$scope.sortWatchList();
				});
			}
			window.localStorage.setItem("watchlist", JSON.stringify($scope.watchlist));
			$scope.selectScreenById("watchlist");
			break;
		case "portfolio":
			if ($scope.isInPortfolio($scope.selectedStock.symbol)) {
				$scope.safeApply(function () {
					i = $scope.portfolio.length - 1;
					while (i >= 0) {
						if ($scope.portfolio[i].symbol === $scope.selectedStock.symbol) {
							$scope.portfolio.splice(i, 1);
						}
						i -= 1;
					}
				});
				window.localStorage.setItem("portfolio", JSON.stringify($scope.portfolio));
				$scope.selectScreenById("portfolio");
			} else {
				$scope.chooseQtyPtf = !$scope.chooseQtyPtf;
			}
			break;
		}
	};

	$scope.setChartLength = function (length) {
		$scope.loading = true;
		$scope.selectedHistory = length;
		$scope.fetchHistoryData();
	};

	$scope.toggleExtended = function () {
		$scope.showExtended = !$scope.showExtended;
	};

	$scope.getDataCellClass = function (val) {
		if (!val) {
			return "dataCell";
		}
		if (val.indexOf("+") >= 0) {
			return "dataCellUp";
		}
		if (val.indexOf("-") >= 0) {
			return "dataCellDown";
		}
		return "dataCell";
	};

	$scope.getChartButtonClass = function (key) {
		return key === $scope.selectedHistory ? "chartButtonSelected" : "chartButton";
	};

	$scope.previousVersionWatchlist = function () {
		var wlSymbols = [], i, glob_watchListPrefix = "watch://", data;
		try {
			for (i = 0; i < window.localStorage.length; i += 1) {
				if (window.localStorage.key(i).indexOf(glob_watchListPrefix) >= 0) {
					data = JSON.parse(window.localStorage.getItem(window.localStorage.key(i)));
					if (data && data.symbol && data.title) {
						wlSymbols.push({symbol: data.symbol, name: data.title});
					}
				}
			}
		} catch (e) {
			wlSymbols = [];
		}
		return wlSymbols;
	};

	$scope.previousVersionPortfolio = function () {
		var ptf = [], i, glob_ptfPrefix = "ptf://", data;
		try {
			for (i = 0; i < window.localStorage.length; i += 1) {
				if (window.localStorage.key(i).indexOf(glob_ptfPrefix) >= 0) {
					data = JSON.parse(window.localStorage.getItem(window.localStorage.key(i)));
					if (data && data.symbol && data.title && data.quantity) {
						ptf.push({symbol: data.symbol, name: data.title, quantity: data.quantity});
					}
				}
			}
		} catch (e) {
			console.log(e);
			ptf = [];
		}
		return ptf;
	};

	$scope.watchlist = JSON.parse(window.localStorage.getItem("watchlist")) || [];
	if ($scope.watchlist.length === 0) {
		$scope.watchlist = $scope.previousVersionWatchlist();
	}
	$scope.sortWatchList();
	$scope.portfolio = JSON.parse(window.localStorage.getItem("portfolio")) || [];
	if ($scope.portfolio.length === 0) {
		$scope.portfolio = $scope.previousVersionPortfolio();
	}
	$scope.sortPortfolio();

	$scope.backupRestore = function (action) {
		$scope.loading = true;
		$scope.backupRestoreDone = false;
		$scope.backupSuccess = false;
		$scope.restoreSuccess = false;
		$scope.backupCode = "";
		$scope.enterRestoreCode = false;
		if (action === "backup") {
			if ($scope.portfolio.length === 0) {
				$scope.selectScreenById("portfolio");
			} else {
				$scope.selectScreenById("backuprestorestatus");
				MMApi.setPortfolio($scope.portfolio, function (ptfId) {
					var code = "";
					if (ptfId) {
						code = MMApi.encodeId(ptfId);
					}
					if (code !== "") {
						$scope.safeApply(function () {
							$scope.backupCode = code;
							$scope.backupRestoreDone = true;
							$scope.backupSuccess = true;
							$scope.loading = false;
						});
					} else {
						$scope.safeApply(function () {
							$scope.selectScreen(undefined);
						});
					}
				});
			}
		} else if (action === "enterrestorecode") {
			$scope.inputRestoreCode = "";
			$scope.enterRestoreCode = true;
		} else if (action === "restore") {
			var ptfId = "";
			$scope.selectScreenById("backuprestorestatus");
			if ($scope.restoreCode !== "") {
				ptfId = MMApi.decodeId($scope.restoreCode);
			}
			if (ptfId !== "") {
				MMApi.getPortfolio(ptfId, function (data) {
					if (data && data.data && data.resultCode === 0) {
						console.log("restoring");
						var ptfData = JSON.parse(data.data);
						$scope.safeApply(function () {
							$scope.portfolio = ptfData;
							$scope.backupRestoreDone = true;
							$scope.restoreSuccess = true;
							$scope.loading = false;
						});
						window.localStorage.setItem("portfolio", JSON.stringify($scope.portfolio));
					} else {
						$scope.safeApply(function () {
							$scope.selectScreen(undefined);
						});
					}
				});
			} else {
				$scope.safeApply(function () {
					$scope.selectScreen(undefined);
				});
			}
		}
	};

	$scope.shareApp = function () {
		if (window.plugins) {
			if (window.plugins.socialsharing) {
				window.plugins.socialsharing.share(null, null, null, "https://play.google.com/store/apps/details?id=com.phonegap.mobmarketpro");
			} else {
				alert("window.plugins.socialsharing undefined");
			}
		} else {
			alert("window.plugins undefined");
		}
	};

	// handle device back button
	document.addEventListener("backbutton", function () {
		$scope.safeApply(function () {
			$scope.goBack($scope.selectedScreen);
		});
	}, false);

	document.addEventListener("menubutton", function () {
		$scope.safeApply(function () {
			$scope.selectScreen(undefined);
		});
	});

	document.addEventListener("searchbutton", function () {
		$scope.safeApply(function () {
			$scope.selectScreenById("search");
		});
	});
});

// touch directive
mmapp.directive("touchBtn", function () {
	"use strict";
	return function (scope, element, attrs) {
		var elm = element[0],
			touchstartEvent,
			touchmoveEvent,
			touchendEvent,
			restoreDefault = function () {
				elm.style.opacity = "1";
				elm.removeEventListener("touchmove", touchmoveEvent);
				elm.removeEventListener("touchend", touchendEvent);
			};
		touchmoveEvent = function () {
			restoreDefault();
		};
		touchendEvent = function () {
			if (attrs.touchAction && scope[attrs.touchAction] && typeof scope[attrs.touchAction] === "function") {
				scope.$apply(scope[attrs.touchAction](attrs.touchBtn));
			}
			restoreDefault();
		};
		touchstartEvent = function () {
			elm.style.opacity = "0.6";
			elm.addEventListener("touchend", touchendEvent);
			elm.addEventListener("touchmove", touchmoveEvent);
		};
		elm.addEventListener("touchstart", touchstartEvent);
	};
});

// chart directive
mmapp.directive("drawChart", function () {
	"use strict";
	return function (scope, element, attrs) {
		scope.$watch("chartData", function () {
			scope.safeApply(function () {
				scope.chart = $.plot(
					$("#divChart"),
					[{data: scope.chartData, lines: {show: true}}],
					{
						xaxis: {mode: "time", show: true, font: {color: "#ffffff"}},
						yaxis: {show: true, font: {color: "#ffffff"}},
						grid: {
							backgroundColor: {colors: ["#606060", "#000000"]},
							minBorderMargin: 2,
							borderWidth: 1,
							axisMargin: 4
						}
					}
				);
			});
		});
	};
});

/*
document.addEventListener("deviceready", function () {
	"use strict";
*/
	angular.bootstrap(document, ["mmapp"]);
/*
}, false);
*/