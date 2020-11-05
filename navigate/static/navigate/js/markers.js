function clearMarkers() {
    Object.values(markers).forEach((marker) => {
        marker.setMap(null);
    });
    markers = {};
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

        const contentString = 
            "<div><strong>" +
            place.name +
            "</strong><br>" +
            "rating: " +
            place.rating +
            "<br>" +
            place.vicinity +
            "</div>"
            ;

        const markerinfowindow = new google.maps.InfoWindow({
        content: contentString,
        });

        // Mouseover
        marker.addListener("mouseover", () => {
            highlightMarker(marker);
            markerinfowindow.open(map, marker);
      });


        // Mouseout
        marker.addListener("mouseout", () => {
            unhighlightMarker(marker);
            markerinfowindow.close();
        });

        // Scroll to Place
        marker.addListener("click", () => {
            updateToVisit(place);
        });

        markers[place.place_id] = marker
        placesList.appendChild(createSearchResult(place, labelIndex++));

        marker.addListener("click", () => {
            scrollResults(place);
        });

        bounds.extend(place.geometry.location);
    }
    map.fitBounds(bounds);
}










