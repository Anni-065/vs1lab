/* Dieses Skript wird ausgeführt, wenn der Browser index.html lädt. */

// Befehle werden sequenziell abgearbeitet ...

/**
 * "console.log" schreibt auf die Konsole des Browsers
 * Das Konsolenfenster muss im Browser explizit geöffnet werden.
 */
console.log("The script is going to start...");

// Es folgen einige Deklarationen, die aber noch nicht ausgeführt werden ...

function GeoTag(latitude, longitude, name, hashtag) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.name = name;
    this.hashtag = hashtag;
}

function tagSubmit() {
    event.preventDefault();
    let newTag = JSON.stringify(new GeoTag($("#tLatitude").val()
        , $("#tLongitude").val()
        , $("#tName").val()
        , $("#tHashtag").val()));

    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState === XMLHttpRequest.DONE) {
            if (xhttp.status === 201) {
                writeTagsToDiscovery(xhttp.response);
            } else {
                console.log("Could not create new tag: " + xhttp.status);
            }

        }
    };

    xhttp.open("POST", "/geotags");
    xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.send(newTag);
}

function searchSubmit() {
    event.preventDefault();
    let lat = document.getElementById("dLatitude").value;
    let long = document.getElementById("dLongitude").value;
    let search = document.getElementById("dSearch").value;

    const urlSearchParams = new URLSearchParams();
    if (search !== "") {
        urlSearchParams.set("search", search);
    } else {
        urlSearchParams.set("latitude", lat);
        urlSearchParams.set("longitude", long);
    }

    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState === XMLHttpRequest.DONE) {
            if (xhttp.status === 200) {
                writeTagsToDiscovery(xhttp.response);
            } else {
                console.log("Could not find tags: " + xhttp.status);
            }

        }
    };


    xhttp.open("GET", "/geotags?" + urlSearchParams.toString());
    xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.send();
}

function writeTagsToDiscovery(response) {
    let taglist = JSON.parse(response);

    let ul = document.getElementById("results");
    ul.innerHTML = "";
    taglist.forEach(tag => {
        let li = document.createElement("li");
        li.appendChild(document.createTextNode(tag.name
            + " ("
            + tag.latitude
            + ", "
            + tag.longitude
            + ") "
            + tag.hashtag));
        ul.appendChild(li);
    });

    if (taglist.length > 0) {
        document.getElementById("dLatitude").value = taglist[0].latitude;
        document.getElementById("dLongitude").value = taglist[0].longitude;
    }

    gtaLocator.updateLocation(taglist);
}

// Hier wird die verwendete API für Geolocations gewählt
// Die folgende Deklaration ist ein 'Mockup', das immer funktioniert und eine fixe Position liefert.
GEOLOCATIONAPI = {
    getCurrentPosition: function(onsuccess) {
        onsuccess({
            "coords": {
                "latitude": 53.83808850792929,
                "longitude": -9.351957062533689,
                "altitude": null,
                "accuracy": 39,
                "altitudeAccuracy": null,
                "heading": null,
                "speed": null
            },
            "timestamp": 1540282332239
        });
    }
};

// Die echte API ist diese.
// Falls es damit Probleme gibt, kommentieren Sie die Zeile aus.
GEOLOCATIONAPI = navigator.geolocation;

/**
 * GeoTagApp Locator Modul
 */
var gtaLocator = (function GtaLocator(geoLocationApi) {

    // Private Member

    /**
     * Funktion spricht Geolocation API an.
     * Bei Erfolg Callback 'onsuccess' mit Position.
     * Bei Fehler Callback 'onerror' mit Meldung.
     * Callback Funktionen als Parameter übergeben.
     */
    var tryLocate = function(onsuccess, onerror) {
        if (geoLocationApi) {
            geoLocationApi.getCurrentPosition(onsuccess, function(error) {
                var msg;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        msg = "User denied the request for Geolocation.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        msg = "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        msg = "The request to get user location timed out.";
                        break;
                    case error.UNKNOWN_ERROR:
                        msg = "An unknown error occurred.";
                        break;
                }
                onerror(msg);
            });
        } else {
            onerror("Geolocation is not supported by this browser.");
        }
    };

    // Auslesen Breitengrad aus der Position
    var getLatitude = function(position) {
        return position.coords.latitude;
    };

    // Auslesen Längengrad aus Position
    var getLongitude = function(position) {
        return position.coords.longitude;
    };

    // Hier API Key eintragen
    var apiKey = "YOUR_API_KEY_HERE";

    /**
     * Funktion erzeugt eine URL, die auf die Karte verweist.
     * Falls die Karte geladen werden soll, muss oben ein API Key angegeben
     * sein.
     *
     * lat, lon : aktuelle Koordinaten (hier zentriert die Karte)
     * tags : Array mit Geotag Objekten, das auch leer bleiben kann
     * zoom: Zoomfaktor der Karte
     */
    var getLocationMapSrc = function(lat, lon, tags, zoom) {
        zoom = typeof zoom !== 'undefined' ? zoom : 10;

        if (apiKey === "YOUR_API_KEY_HERE") {
            console.log("No API key provided.");
            return "images/mapview.jpg";
        }

        var tagList = "&pois=You," + lat + "," + lon;
        if (tags !== undefined) tags.forEach(function(tag) {
            tagList += "|" + tag.name + "," + tag.latitude + "," + tag.longitude;
        });

        var urlString = "https://www.mapquestapi.com/staticmap/v4/getmap?key=" +
            apiKey + "&size=600,400&zoom=" + zoom + "&center=" + lat + "," + lon + "&" + tagList;

        console.log("Generated Maps Url: " + urlString);
        return urlString;
    };

    return { // Start öffentlicher Teil des Moduls ...

        // Public Member

        readme: "Dieses Objekt enthält 'öffentliche' Teile des Moduls.",

        updateLocation: function(taglist) {
            if (!taglist) {
                taglist = $("#result-img").data("tags");
            }

            if ($("#dLatitude").val() !== ""
                && $("#dLongitude").val() !== "") {
                $("#result-img").attr('src', getLocationMapSrc(
                    $("#dLatitude").val(),
                    $("#dLongitude").val(),
                    taglist,
                    "13"));
            } else {
                tryLocate(
                    function (position) {
                        const latitude = getLatitude(position);
                        const longitude = getLongitude(position);


                        console.log("LAT: " + latitude);
                        console.log("LONG: " + longitude);
                        document.getElementById("tLatitude").setAttribute('value', latitude);
                        document.getElementById("tLongitude").setAttribute('value', longitude);
                        document.getElementById("dLatitude").setAttribute('value', latitude);
                        document.getElementById("dLongitude").setAttribute('value', longitude);

                        document.getElementById("result-img").src = getLocationMapSrc(latitude,
                            longitude,
                            taglist,
                            "13");

                    },
                    function (msg) {
                        alert(msg);
                    }
                )
            }
        }
    }; // ... Ende öffentlicher Teil
})(GEOLOCATIONAPI);

/**
 * $(function(){...}) wartet, bis die Seite komplett geladen wurde. Dann wird die
 * angegebene Funktion aufgerufen. An dieser Stelle beginnt die eigentliche Arbeit
 * des Skripts.
 */
$(function() {
    gtaLocator.updateLocation();
});
