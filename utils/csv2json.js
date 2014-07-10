#!/usr/bin/env node

var getopt = require('node-getopt');
var csv = require('fast-csv');
var fs = require('fs');

var opt = new getopt([
	['s', 'scenario=1|2|3', 'the scenario'],
	['t', 'technology=svg|canvas|webgl', 'the technology'],
	['c', 'cutoff=nr', 'the cutoff value'],
	['h', 'help', 'display this help']
]);

var args = opt.parseSystem();
var scenario = args.options.scenario.toLowerCase ? args.options.scenario.toLowerCase() : undefined;
var technology = args.options.technology.toLowerCase ? args.options.technology.toLowerCase() : undefined;
var cutoff = +args.options.cutoff || undefined;

var files = {
	cvd: {
		path: '../data/cvd.csv',
		options: {
			headers: true,
			ignoreEmpty: true,
			delimiter: ' '
		}
	},
	ohg: {
		path: '../data/offenerhaushalt_gemeinde_40101_jahr_2012.csv',
		options: {
			headers: true,
			ignoreEmpty: true,
			delimiter: ';'
		}
	}
};

var data = [];

if(['1', '2', '3'].indexOf(scenario) != -1 && ['svg', 'canvas', 'webgl'].indexOf(technology) != -1) {
	var f;
	switch(scenario) {
		case '1':
			f = files.cvd;
			break;

		case '2':
			f = files.ohg;
			break;

		case '3':
			f = files.cvd;
			break;
	}

	if(!fs.existsSync(f.path)) {
		console.error('file does not exist.');
		process.exit(1);
	}

	csv.fromPath(f.path, f.options)
		.on('record', function(d){
			if(['1'].indexOf(scenario) != -1) {
				d.cvd = +d.cvd;
				d.tmpd = +d.tmpd;
				d.o3mean = +d.o3mean;

				delete d.date;

				data.push(d);
			}
			else if(['2'].indexOf(scenario) != -1) {
				d.gkz = +d.gkz;
				d.haushaltshinweis = +d.haushaltshinweis;
				d.unterabschnitt = +d.unterabschnitt;
				d.postengruppe = +d.postengruppe;
				d.betrag = +d.betrag.replace(',', '.');
				d.jahr = +d.jahr;

				data.push(d);
			}
			else if(['3'].indexOf(scenario) != -1) {
				d.year = +d.date.substring(0, 4);
				d.month = +d.date.substring(5, 7);
				d.cvd = +d.cvd;

				delete d.date;
				delete d.tmpd;
				delete d.o3mean;

				if(data.length == 0 && Object.prototype.toString.call(data) == '[object Array]') {
					data = {};
				}

				if(data[d.month] === undefined) {
					data[d.month] = {};
				}

				if(data[d.month][d.year] === undefined) {
					data[d.month][d.year] = {
						count: 0,
						sum: 0,
						value: 0
					};
				}

				data[d.month][d.year].count++;
				data[d.month][d.year].sum += d.cvd;
				data[d.month][d.year].value = data[d.month][d.year].sum / data[d.month][d.year].count;
			}
		})
		.on('end', function() {
			if(cutoff !== undefined) {
				if(Object.prototype.toString.call(data) == '[object Object]') {
					var data2 = data;
					var keys = Object.keys(data2);
					data = [];
					for(var i = 0; i < keys.length; i++) {
						var data3 = data2[keys[i]];
						var keys3 = Object.keys(data3);
						var temp = [];

						for(var j = 0; j < cutoff; j++) {
							temp.push({
								year: keys3[j],
								month: keys[i],
								value: data3[keys3[j]].value
							});
						}

						data.push({
							month: keys[i],
							value: temp
						});
					}
				}
				else {
					cutoff = +cutoff;
					data = data.slice(0, cutoff);

					while(data.length > cutoff) {
						delete data[Math.floor(Math.random() * (data.length + 1))];
					}
				}
			}

			if(scenario == '2') {
				var tmp = data;
				data = {
					'name': 'Offener Haushalt',
					'children': []
				};

				var haushaltshinweisName = [];
				var unterabschnittName = [];

				tmp.forEach(function(entry) {
					if(haushaltshinweisName.indexOf(entry.haushaltshinweis_name) == -1) {
						haushaltshinweisName.push(entry.haushaltshinweis_name);
					}

					if(unterabschnittName.indexOf(entry.unterabschnitt_name) == -1) {
						unterabschnittName.push(entry.unterabschnitt_name);
					}
				});

				haushaltshinweisName.forEach(function(hhn) {
					var data1 = {
						'name': hhn,
						'children': []
					};

					unterabschnittName.forEach(function(uan) {
						var data2 = {
							'name': uan,
							'children': []
						};

						tmp.forEach(function(d) {
							if(d.haushaltshinweis_name == hhn && d.unterabschnitt_name == uan) {
								data2.children.push({
									'name': d.postengruppe_name,
									'size': Math.round(+d.betrag)
								});
							}
						});

						data1.children.push(data2);
					});

					data.children.push(data1);
				});
			}
			
			console.log('var data = ' + JSON.stringify(data) + ';');
		})
	;
}
else {
	opt.showHelp();
	process.exit(1);
}

