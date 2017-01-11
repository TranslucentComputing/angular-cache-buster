angular.module('ngCacheBuster', [])
    .config(['$httpProvider', function ($httpProvider) {
        return $httpProvider.interceptors.push('httpRequestInterceptorCacheBuster');
    }])
    .provider('httpRequestInterceptorCacheBuster', function () {

        this.matchlist = [/.*partials.*/, /.*views.*/];
        this.logRequests = false;

        //Default to whitelist (i.e. block all except matches)
        this.black = false;

        //Select blacklist or whitelist, default to whitelist
        this.setMatchlist = function (list, black) {
            this.black = typeof black != 'undefined' ? black : false;
            this.matchlist = list;
        };

        this.setVersionNumber = function (versionNumber) {
            this.versionNumber = versionNumber;
        };

        this.setLogRequests = function (logRequests) {
            this.logRequests = logRequests;
        };

        this.$get = ['$q', '$log', function ($q, $log) {
            var matchlist = this.matchlist;
            var logRequests = this.logRequests;
            var black = this.black;
            var versionNumber = this.versionNumber;
            var mdSvgPattern = /(md)(\-+|.+)(\.svg)/i; //match md svg files
            if (logRequests) {
                $log.log("Blacklist? ", black);
            }
            return {
                'request': function (config) {
                    //Blacklist by default, match with whitelist
                    var busted = !black;

                    //add version number to update all the resources after new build
                    if (versionNumber) {
                        if (!~config.url.indexOf('templates.') && !mdSvgPattern.test(config.url)
                            && (!~config.url.indexOf('.html') || config.url == "index.html")) { //exclude some of the cached templates
                            config.url = config.url.replace(new RegExp('v='+versionNumber,'g'), ''); //remove if exists
                            config.url += config.url.indexOf('?') === -1 ? '?' : '&'; //add correct modifier
                            config.url += 'v=' + versionNumber; //add version param
                        }
                    }

                    for (var i = 0; i < matchlist.length; i++) {
                        if (config.url.match(matchlist[i])) {
                            busted = black;
                            break;
                        }
                    }

                    //Bust if the URL was on blacklist or not on whitelist
                    if (busted) {
                        var d = new Date();
                        config.url = config.url.replace(/[?|&]cb=\d+/, '');
                        //Some url's allready have '?' attached
                        config.url += config.url.indexOf('?') === -1 ? '?' : '&';
                        config.url += 'cb=' + d.getTime();
                    }

                    if (logRequests) {
                        var log = 'request.url =' + config.url;
                        busted ? $log.warn(log) : $log.info(log);
                    }

                    return config || $q.when(config);
                }
            }
        }];
    });
