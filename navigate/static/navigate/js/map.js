const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;

let pos;
let map;
let bounds;
let infoWindow;
let currentInfoWindow;
let service;
let markers = {};

let location_data;
let toVisit;

let djikstraButton = document.getElementById('doDjikstra');
let placesList = document.getElementById("search-results");

djikstraButton.addEventListener("click", () => {
    doDjikstra();
})

function initMap() {
    // Initialize variables
    infoWindow = new google.maps.InfoWindow;
    currentInfoWindow = infoWindow;

    // Try HTML5 geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            map = new google.maps.Map(document.getElementById('map'), {
                center: pos,
                zoom: 15
            });
            
            setMap(pos);
            getNearbyPlaces(pos);

            const input = document.getElementById("address");
            const searchBox = new google.maps.places.SearchBox(input);
            map.addListener("bounds_changed", () => {
                searchBox.setBounds(map.getBounds());
            });
            searchBox.addListener("places_changed", () => {
                const places = searchBox.getPlaces();
                let newpos = places[0].geometry.location;

                setMap(newpos)
                getNearbyPlaces(newpos);
            });
        }, () => {
            // Browser supports geolocation, but user has denied permission
            handleLocationError(true, infoWindow);
        });
    } else {
        // Browser doesn't support geolocation
        handleLocationError(false, infoWindow);
    }
}

// Handle a geolocation error
function handleLocationError(browserHasGeolocation, infoWindow) {
    // Set default location to Sydney, Australia
    pos = { lat: -33.856, lng: 151.215 };
    map = new google.maps.Map(document.getElementById('map'), {
        center: pos,
        zoom: 15
    });

    // Display an InfoWindow at the map center
    infoWindow.setPosition(pos);
    infoWindow.setContent(browserHasGeolocation ?
        'Geolocation permissions denied. Using default location.' :
        'Error: Your browser doesn\'t support geolocation.');
    infoWindow.open(map);
    currentInfoWindow = infoWindow;

    // Call Places Nearby Search on the default location
    getNearbyPlaces(pos);
}

function setMap(pos) {
    clearMarkers();
    location_data = [];
    toVisit = [];
    djikstraButton.disabled = true;
    placesList.innerHTML = "";

    bounds = new google.maps.LatLngBounds();
    bounds.extend(pos);

    map.setCenter(pos);
}

// Perform a Places Nearby Search Request
function getNearbyPlaces(position) {
    let request = {
        location: position,
        rankBy: google.maps.places.RankBy.DISTANCE,
        type: ['bar'],
    };

    service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, nearbyCallback);
}

// Handle the results (up to 20) of the Nearby Search
function nearbyCallback(results, status) {
    if (status !== "OK") return;
    // console.log(results);
    createMarkers(results);
    location_data = []
    for (let data of results) {
        location_data.push({ 
            "name": data.name, 
            "lat": data.geometry.location.lat(), 
            "lng": data.geometry.location.lng() 
        })
    }

    // console.log(location_data)
    displayGraph();
}

function clearMarkers() {
    Object.values(markers).forEach((marker) => {
        marker.setMap(null);
    });
    markers = {};
}

function createMarkers(places) {
    labelIndex = 1;
    for (let i = 0, place; (place = places[i]); i++) {
        const defaultMarker = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 15,
            strokeColor: '#000000',
            strokeWeight: 2,
            fillColor: '#FF3333',
            fillOpacity: 1,
        };
        let marker = new google.maps.Marker({
            map: map,
            icon: defaultMarker,
            title: place.name,
            position: place.geometry.location,
            label: { text: "" + labelIndex, color: '#FFFFFF' },
            zIndex: -(labelIndex),
        });

        marker.addListener("mouseover", () => {
            highlightMarker(marker);
        });

        marker.addListener("mouseout", () => {
            unhighlightMarker(marker);
        });

        marker.addListener("click", () => {
            updateToVisit(place);
        });

        markers[place.place_id] = marker
        placesList.appendChild(createSearchResult(place, labelIndex++));

        bounds.extend(place.geometry.location);
    }
    map.fitBounds(bounds);
}

function createSearchResult(place, index) {
    let li = document.createElement("li");

    let infoContainer = document.createElement('div');
    let photoContainer = document.createElement('div');

    photoContainer.classList.add('photo-container');
    infoContainer.classList.add('info-container');

    infoContainer.innerHTML = '<strong>' + index + '. ' + place.name + '</strong><br>'

    if (place.rating) {
        infoContainer.innerHTML += 'Rating: ' + place.rating + ' (' + place.user_ratings_total + ')<br>'
    }

    infoContainer.innerHTML += place.vicinity + '<br>'

    if (place.opening_hours) {
        if (place.opening_hours.open_now) {
            infoContainer.innerHTML += 'Open now <br>'
        } else {
            infoContainer.innerHTML += 'Closed <br>'
        }
    }

    if (place.photos != null) {
        let photo = document.createElement('img');
        let firstPhoto = place.photos[0];
        photo.classList.add('result-photo');
        photo.src = firstPhoto.getUrl();
        photoContainer.appendChild(photo)
    }

    li.appendChild(photoContainer);
    li.appendChild(infoContainer);

    // li.id = place.place_id;

    li.addEventListener("mouseover", () => {
        highlightMarker(markers[place.place_id]);
    });

    li.addEventListener("mouseout", () => {
        unhighlightMarker(markers[place.place_id]);
    });

    li.addEventListener("click", () => {
        updateToVisit(place);
    });

    return li
}

function highlightMarker(marker) {
    for (place of toVisit) {
        if (place.name === marker.title) {
            return
        }
    }
    let icon = marker.icon;
    icon.fillColor = '#FFDD33';
    marker.setIcon(icon);
    marker.zIndex += 30;
}

function unhighlightMarker(marker) {
    for (place of toVisit) {
        if (place.name === marker.title) {
            return
        }
    }
    let icon = marker.icon;
    icon.fillColor = '#FF3333';
    marker.setIcon(icon);
    marker.zIndex -= 30;
}

function updateToVisit(place) {
    if (toVisit.length >= 1 && toVisit[0].name === place.name) {
        toVisit.shift();
        djikstraButton.disabled = true;
    } else if (toVisit.length == 2 && toVisit[1].name === place.name) {
        toVisit.pop();
        djikstraButton.disabled = true;
    } else { 
        if (toVisit.length == 2) {
            toVisit.shift();
        }
        toVisit.push({
            "name": place.name, 
            "lat": place.geometry.location.lat(), 
            "lng": place.geometry.location.lng()
        });
        if (toVisit.length == 2) {
            djikstraButton.disabled = false;
        }
    }
}

function doDjikstra() {
    const request = new Request(
        "/djikstra", {
        method: 'POST',
        mode: 'same-origin',
        headers: {
            'X-CSRFToken': csrftoken,
            'Content-type': 'application/json'
        },
        body: JSON.stringify({
            'location_data': location_data,
            'start_point': toVisit[0],
            'end_point': toVisit[1]
        }),
        // body: JSON.stringify(location_data),
    });

    console.log(request)

    fetch(request)
    .then(response => response.json())
    .then((data) => {
        let answer = data
        // console.log(answer)
        // for (let point of answer.path) {
        //     let marker = new google.maps.Marker({
        //         map: map,
        //         position: point
        //     });
        // }
        let flightPlanCoordinates = answer.path
        let flightPath = new google.maps.Polyline({
            path: flightPlanCoordinates,
            geodesic: true,
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 2
        });

        flightPath.setMap(map)
    });
}

// // Builds an InfoWindow to display details above the marker
// function showDetails(placeResult, marker, status) {
//     if (status == google.maps.places.PlacesServiceStatus.OK) {
//         let placeInfowindow = new google.maps.InfoWindow();
//         placeInfowindow.setContent('<div><strong>' + placeResult.name +
//             '</strong><br>' + 'Rating: ' + placeResult.rating + '</div>');
//         placeInfowindow.open(marker.map, marker);
//         currentInfoWindow.close();
//         currentInfoWindow = placeInfowindow;
//     } else {
//         console.log('showDetails failed: ' + status);
//     }
// }

function displayGraph() {
    const request = new Request(
        "/graph", {
        method: 'POST',
        mode: 'same-origin',
        headers: {
            'X-CSRFToken': csrftoken,
            'Content-type': 'application/json'
        },
        body: JSON.stringify(location_data),
    });

    fetch(request)
    .then(response => response.json())
    .then((data) => {
        let answer = data
        
        for (let pair of answer) {
            let edge = new google.maps.Polyline({
                path: pair,
                geodesic: true,
                strokeColor: '#FF0000',
                strokeOpacity: 1.0,
                strokeWeight: 2
            });

            edge.setMap(map)
        }
    });
}