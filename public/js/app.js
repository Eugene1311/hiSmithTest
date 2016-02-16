var hsApp = angular.module('HsApp', ['ui.router', 'ngSanitize', 'ui.bootstrap', 'bootstrapLightbox']);
hsApp.config( function($locationProvider, $stateProvider, $urlRouterProvider, $httpProvider) {
  // Используем x-www-form-urlencoded Content-Type
  $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';
 
  // Переопределяем дефолтный transformRequest в $http-сервисе
  $httpProvider.defaults.transformRequest = [function(data) {
    /**
     * рабочая лошадка; преобразует объект в x-www-form-urlencoded строку.
     * @param {Object} obj
     * @return {String}
     */ 
    var param = function(obj) {
      var query = '';
      var name, value, fullSubName, subValue, innerObj, i;
      
      for(name in obj) {
        value = obj[name];
        
        if(value instanceof Array) {
          for(i=0; i<value.length; ++i) {
            subValue = value[i];
            fullSubName = name + '[' + i + ']';
            innerObj = {};
            innerObj[fullSubName] = subValue;
            query += param(innerObj) + '&';
          }
        } else if(value instanceof Object) {
          for(subName in value) {
            subValue = value[subName];
            fullSubName = name + '[' + subName + ']';
            innerObj = {};
            innerObj[fullSubName] = subValue;
            query += param(innerObj) + '&';
          }
        } else if(value !== undefined && value !== null) {
          query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
        }
      }
      
      return query.length ? query.substr(0, query.length - 1) : query;
    };
    
    return angular.isObject(data) && String(data) !== '[object File]' ? param(data) : data;
  }];
  $locationProvider.html5Mode(true);
  $urlRouterProvider.otherwise("/search");
  $stateProvider
    .state('search', {
      url: "/search",
      controller: function($scope) {
        $scope.$emit('changeSelection', 'search');
      }
    })
    .state('news', {
      url: "/news",
      templateUrl: "views/news.html",
      controller: function($scope) {
        $scope.$emit('changeSelection', 'news');
      }
    })
    .state('newsItem', {
      url: "/news/:id",
      templateUrl: "views/news.item.html",
      controller: function($scope, $stateParams) {
        var id = parseFloat($stateParams.id);
        $scope.item = $scope.news[id -1];
        $scope.$emit('changeSelection', '');
      }
    })
});
hsApp.directive('slideit', function($timeout) {
  return {
    restrict: 'A',
    replace: true,
    scope: {
     slideit: '=' 
    },
    template: '<ul class="bxslider">' +
                '<li ng-repeat="slide in slides">' +
                  '<a ng-click="openLightboxModal($index)">' +
                    '<img src="{{slide}}" alt="news photo" data-lightbox="image-{{$index}}">' +
                  '</a>' +
                '</li>' +
              '</ul>',
    link: function(scope, element, attrs) {
      $(element).ready(function() {
        $timeout(function() {
          scope.$apply(function() {
            scope.slides = scope.slideit;
          });
          if (scope.slides.length > 1) {
            $(element).bxSlider({
              adaptiveHeight: true,
              mode: 'fade'
            });
          }
        });
      });
    },
    controller: function($scope, Lightbox) {
      $scope.openLightboxModal = function (index) {
        Lightbox.openModal($scope.slides, index);
      };
    }
  }
});
hsApp.controller('MainCtrl', function ($scope, $location, $q, $timeout, $http) {
  $scope.menuItems = [
    ['search', 'Поиск'],
    ['news', 'Новости']
  ];
  $scope.selected = 'search';
  $scope.select = function(item) {
    $scope.selected = item;
  };
  $scope.isActive = function(item) {
    return $scope.selected === item;
  };
  $scope.sendRequest = function() {
    var data = {
      query: this.query
    };
    $http.defaults.headers.post['Accept'] = 'application/json';
    $http.post("http://ft.dev.hismith.ru/stat/create/", data).
      success(function(data) {
        console.log(data);
      }).
      error(function(data, status) {
        console.log(status);
      });
    VK.Api.call('newsfeed.search', {q: this.query, count: 10}, function(r) { 
      if(r.response) {
        console.log(r.response);
        $scope.$apply($location.path('/news'));
        r.response.splice(0, 1);
        $scope.news = [];
        r.response.forEach(function(item) {
          var data = {
            date: item.date,
            from_id: item.from_id,
            text: item.text,
            photos: [],
            likesCount: item.likes.count
          }
          if (item.attachments) {
            item.attachments.forEach(function(i) {
              if (i.type === 'photo') {
                data.photos.push(i.photo.src_big);
              }
            });
          }
          $scope.news.push(data);
        });
        var users_ids = [],
            groups_ids = [];
        $scope.news.forEach(function(item) {
          if (item.from_id > 0) {
            users_ids.push(item.from_id);
          } else {
            groups_ids.push( Math.abs(item.from_id) );
          }          
        });
        if (users_ids.length > 0) {
          VK.Api.call('users.get', {
            user_ids: users_ids.join(','),
            fields: 'first_name, last_name'
          }, function(res, err) {
            if (err) {
              console.log(err);
            }
            res.response.forEach(function(item) {
              $scope.news.forEach( function(i) {
                if (i.from_id === item.uid) {
                  i.name = item.first_name + ' ' + item.last_name;
                }
              });
            });
            $scope.$apply($scope.news);
          });
        }
        if (groups_ids.length > 0) {
          VK.Api.call('groups.getById', {
            group_ids: groups_ids.join(',')
          }, function(res, err) {
            if (err) {
              console.log(err);
            }
            res.response.forEach(function(item) {
              $scope.news.forEach( function(i) {
                if (Math.abs(i.from_id) === item.gid) {
                  i.name = item.name;
                }
              });
            });
            $scope.$apply($scope.news); 
          });
        }
      } else {
        console.log(r);
      }
    }); 
  };
  $scope.$on('changeSelection', function(event, tabName) {
    $scope.selected = tabName;
  });
});