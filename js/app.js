Parse.initialize("0HCUh6LvopdYVtTKiNnWpvpISGzownaAgXW6rVIo", "LJJHYIxW1CeP7ujWkTObFjicnKKFhqnhqSGvr0u2");

var app = angular.module('aerolineafsi', ['ngMaterial', 'ngRoute', 'parse-angular', 'googlechart']);

app.config(function($routeProvider) {
    $routeProvider
    .when('/', {
        templateUrl : 'views/index.html',
        controller  : 'indexController',
        requireLogin : false,
        title : 'Inicia sesión'
    })
    .when('/flights', {
        templateUrl : 'views/flight.html',
        controller  : 'flightController',
        requireLogin : true,
        title : 'Lista de Vuelos'
    })
    .when('/addFlight', {
        templateUrl : 'views/add.html',
        controller  : 'addFlightController',
        requireLogin : true,
        title : 'Crear Vuelo'
    })
    .when('/cities', {
        templateUrl : 'views/cities.html',
        controller  : 'citiesController',
        requireLogin : false,
        title : 'Ciudades más visitadas'
    })
    .otherwise({
        redirectTo:'/'
    });
});

app.run(['$location', '$rootScope', '$http', function($location, $rootScope, $http) {
    $rootScope.$on('$routeChangeStart', function (event, current, previous) {
        $rootScope.title = current.$$route.title;
        if(Parse.User.current()){
            if($location.path() == '/'){
                $location.path('/flights');
            }
        }else{
            if($location.path() != '/cities'){
                $location.path('/');
            }
        }
    });
}]);

app.controller('navbarController',['$scope', '$location', '$http', '$mdDialog', function($scope, $location, $http, $mdDialog){
    $scope.isActive = function(path){
        return $location.path() == path;
    };
    $scope.visible = function(){
        return Parse.User.current() != null;
    };
    $scope.login = function(){
        return $location.path('/');
    };
    $scope.flights = function(){
        return $location.path('/flights');
    };
    $scope.addFlight = function(){
        return $location.path('/addFlight');
    };    
    $scope.cities = function(){
        return $location.path('/cities');
    };
    $scope.logout = function(){
        Parse.User.logOut();
        $location.path('/');
        $scope.showAlert('Has cerrado sesión exitosamente');
    }
    $scope.showAlert = function(message) {
        $mdDialog.show(
            $mdDialog.alert()
            .parent(angular.element(document.body))
            .content(message)
            .ok('Cerrar')
            );
    };
}]);


app.controller('indexController', ['$rootScope', '$http', '$scope', '$mdDialog', '$location', function($rootScope, $http, $scope, $mdDialog, $location) {
    $scope.login = function() {
        Parse.User.logIn($scope.user.username, $scope.user.password, {
            success: function(user) {
                if(user.get("rol") != 1){
                    Parse.User.logOut();
                    $scope.showAlert('No tienes permisos para acceder a esta aplicación');
                }else{
                    $location.path('/flights');
                }
            },
            error: function(user, error) {
                $scope.showAlert('Datos de acceso incorrectos');
            }
        });
    };
    $scope.showAlert = function(message) {
        $mdDialog.show(
            $mdDialog.alert()
            .parent(angular.element(document.body))
            .content(message)
            .ok('Cerrar')
            );
    };
}]);

app.controller('flightController', ['$scope', '$http', function($scope, $http){
    var flight = Parse.Object.extend("Flight");
    var query = new Parse.Query(flight);
    query.include("airplane");
    query.include("destination");
    query.include("origin");
    query.find({
        success: function(results) {
            $scope.flights = [];
            for(var i = 0; i < results.length; i++){
                $scope.flights.push(results[i]);
            }
        },
        error: function(error) {
            $scope.showAlert(error.message);
        }
    });
    $scope.showAlert = function(message) {
        $mdDialog.show(
            $mdDialog.alert()
            .parent(angular.element(document.body))
            .content(message)
            .ok('Cerrar')
            );
    };
}]);

app.controller('addFlightController', ['$http', '$scope', '$mdDialog', '$location', function($http, $scope, $mdDialog, $location) {
    var airport = Parse.Object.extend("Airport");
    var airplane = Parse.Object.extend("Airplane");
    var airportQuery = new Parse.Query(airport);
    var airplaneQuery = new Parse.Query(airplane);
    airportQuery.find({
        success: function(results) {
            $scope.airports = [];
            for(var i = 0; i < results.length; i++){
                $scope.airports.push(results[i]);
            }
        },
        error: function(error) {
            $scope.showAlert(error.message);
        }
    });
    airplaneQuery.find({
        success: function(results) {
            $scope.airplanes = [];
            for(var i = 0; i < results.length; i++){
                $scope.airplanes.push(results[i]);
            }
        },
        error: function(error) {
            $scope.showAlert(error.message);
        }
    });
    $scope.filter = function(text){
        var results = text ? $scope.airports.filter( filterText(text) ) : $scope.airports, deferred;
        return results;
    };
    function filterText(query) {
        var lowercaseQuery = angular.lowercase(query);
        return function filterFn(airport) {
            var lower = angular.lowercase(airport.get("iata"))+'-'+angular.lowercase(airport.get("city"));
            return (lower.indexOf(lowercaseQuery) !== -1);
        };
    };

    $scope.searchTextChange = function(text) {}
    $scope.selectedItemChange = function(item) {}
    $scope.submit = function(){
        if($scope.origin == undefined){
            $scope.showAlert('Debe seleccionar una ciudad de origen');
            return;
        }
        if($scope.destination == undefined){
            $scope.showAlert('Debe seleccionar una ciudad de destino');
            return;
        }
        if($scope.origin === $scope.destination){
            $scope.showAlert('Las ciudades de origen y destino deben ser diferentes');
            return;
        }        
        $scope.departureTime.setDate($scope.date.getDate());
        $scope.departureTime.setMonth($scope.date.getMonth());
        $scope.departureTime.setFullYear($scope.date.getFullYear());
        $scope.arrivalTime.setDate($scope.date.getDate());
        $scope.arrivalTime.setMonth($scope.date.getMonth());
        $scope.arrivalTime.setFullYear($scope.date.getFullYear());
        if($scope.departureTime.getTime() > $scope.arrivalTime.getTime()){            
            $scope.showAlert('La hora de llegada debe ser superior a la hora de salida');
            return;
        }

        var Flight = Parse.Object.extend("Flight");
        var flight = new Flight();
        flight.set("origin", $scope.origin);
        flight.set("destination", $scope.destination);
        flight.set("airplane", $scope.airplanes[0]);
        flight.set("departureDate", $scope.departureTime);
        flight.set("arrivalDate", $scope.arrivalTime);
        flight.set("price", $scope.price);
        flight.save(null, {
          success: function(flight) {
            $location.path('/flights');
            $scope.showAlert('Vuelo creado exitosamente con código: ' + flight.id);
        },
        error: function(flight, error) {
            $scope.showAlert(error.message);
        }
    });
    };
    $scope.showAlert = function(message) {
        $mdDialog.show(
            $mdDialog.alert()
            .parent(angular.element(document.body))
            .content(message)
            .ok('Cerrar')
            );
    };
}]);

app.controller("citiesController", function ($scope, $routeParams, $mdDialog) {
    var airport = Parse.Object.extend("Airport");
    var airportQuery = new Parse.Query(airport);
    airportQuery.find({
        success: function(results) {
            $scope.airports = [];
            for(var i = 0; i < results.length; i++){
                $scope.airports.push(results[i]);
            }
        },
        error: function(error) {
            $scope.showAlert(error.message);
        }
    });    
    $scope.one = [
    {v: "Rio Negro, Colombia"},
    {v: 0}
    ];
    $scope.two = [
    {v: "Bogotá, Colombia"},
    {v: 0}
    ];
    $scope.three = [
    {v: "Cali, Colombia"},
    {v: 0}
    ];
    var Flight = Parse.Object.extend("Flight");
    var query = new Parse.Query(Flight);
    var Airport = Parse.Object.extend("Airport");
    var airport = new Airport();
    airport.id = "MjhvzzkYlw";
    query.equalTo("destination", airport);
    query.count({
        success: function(count) {
            $scope.one[1].v = count;
        },
        error: function(error) {
        }
    });
    airport.id = "MNJfB3b5Od";
    query.equalTo("destination", airport);
    query.count({
        success: function(count) {
            $scope.two[1].v = count;
        },
        error: function(error) {
        }
    });
    airport.id = "3MVNYJD9r7";
    query.equalTo("destination", airport);
    query.count({
        success: function(count) {
            $scope.three[1].v = count;
        },
        error: function(error) {
        }
    });
    $scope.chartObject = {};
    $scope.chartObject.data = {"cols": [
    {id: "t", label: "Topping", type: "string"},
    {id: "s", label: "Slices", type: "number"}
    ], "rows": [
    {c: $scope.one},
    {c: $scope.two},
    {c: $scope.three}
    ]};
    $routeParams.chartType = 'PieChart';
    $scope.chartObject.type = $routeParams.chartType;
    $scope.chartObject.options = {
        'title': 'Vuelos hacia las ciudades principales'
    };

    $scope.filter = function(text){
        var results = text ? $scope.airports.filter( filterText(text) ) : $scope.airports, deferred;
        return results;
    };
    function filterText(query) {
        var lowercaseQuery = angular.lowercase(query);
        return function filterFn(airport) {
            var lower = angular.lowercase(airport.get("iata"))+'-'+angular.lowercase(airport.get("city"));
            return (lower.indexOf(lowercaseQuery) !== -1);
        };
    };
    $scope.searchTextChange = function(text) {};
    $scope.selectedItemOneChange = function(airport) {
        if(airport == undefined){            
            airport = $scope.airports[0];
            $scope.origin = airport;
        }        
        query.equalTo("destination", airport);
        query.count({
            success: function(count) {
                if(count == 0){
                    $scope.showAlert('La ciudad: '+airport.get("city")+' no tiene vuelos');
                }
                $scope.one[0].v = airport.get("city");
                $scope.one[1].v = count;
            },
            error: function(error) {
            }
        });
    };
    $scope.selectedItemTwoChange = function(airport) {
        if(airport == undefined){            
            airport = $scope.airports[1];
            $scope.destination = airport;
        }
        query.equalTo("destination", airport);
        query.count({
            success: function(count) {
                if(count == 0){
                    $scope.showAlert('La ciudad: '+airport.get("city")+' no tiene vuelos');
                }
                $scope.two[0].v = airport.get("city");
                $scope.two[1].v = count;
            },
            error: function(error) {
            }
        });
    };
    $scope.selectedItemThreeChange = function(airport){       
        if(airport == undefined){            
            airport = $scope.airports[3];
            $scope.itemThree = airport;
        }        
        query.equalTo("destination", airport);
        query.count({
            success: function(count) {
                if(count == 0){
                    $scope.showAlert('La ciudad: '+airport.get("city")+' no tiene vuelos');
                }
                $scope.three[0].v = airport.get("city");
                $scope.three[1].v = count;
            },
            error: function(error) {
            }
        });
    };    
    $scope.showAlert = function(message) {
        $mdDialog.show(
            $mdDialog.alert()
            .parent(angular.element(document.body))
            .content(message)
            .ok('Cerrar')
            );
    };
});
