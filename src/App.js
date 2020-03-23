import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import mapboxgl from "mapbox-gl";
import { Alert, AutoComplete, List, Button } from "antd";

/*
CREARE CONTROLLO PER MARKERS E POSIZIONI INSERITE CON UNA LISTA CHE DI BASE PERMETTE DI ELMINARE
L'ELEMENTO, E COME FUNZIONI AGGIUNTIVE PERMETTERÀ DI SELEZIONARNE UNA COME DESTINAZIONE E DI TRACCIARE UN PERCORSO


ALTRA FUNZIONALITÀ SARÀ QUELLA DI FILTRARE I PUNTI INSERITI NEL RAGGIO DI X KM IN BASE ALLA POSIZIONE CERCATA
*/
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
const MAPBOX_API_HOST = "https://api.mapbox.com/";
const MAPBOX_GEOCODING = "geocoding/v5/";
const MAPBOX_DIRECTIONS = "directions/v5";

export default () => {
  const mapContainer = useRef(null);
  const [mapConfig, setMapConfig] = useState({
    lng: 12.1539,
    lat: 42.1048,
    zoom: 5.46
  });
  const [mapManager, setMapManager] = useState();
  const [options, setOptions] = useState([]);
  const [searchValue, setSearchValue] = useState();
  const [markers, setMarkers] = useState([]);

  const handleSearch = value => {
    if (value) {
      const encoded = value;

      fetch(
        `${MAPBOX_API_HOST}${MAPBOX_GEOCODING}mapbox.places/${encoded}.json?access_token=${process.env.REACT_APP_MAPBOX_TOKEN}`
      )
        .then(response => {
          return response.json();
        })
        .then(data => {
          const options = (data.features || []).map(
            ({ id, place, place_name, center }) => (
              <AutoComplete.Option key={id} value={center}>
                {place_name}
              </AutoComplete.Option>
            )
          );
          setOptions(options);
        });
    }
  };

  const handleChange = current => {
    setSearchValue(current);
  };

  const onSelect = (value, option) => {
    setSearchValue(option.children);
    mapManager.flyTo({ center: value, zoom: 12 });
    const marker = new mapboxgl.Marker()
      .setLngLat(value)
      .setPopup(new mapboxgl.Popup().setText(option.children));

    marker.addTo(mapManager);
    setMarkers([...markers, marker]);
  };

  const removeMarker = (marker, index) => {
    marker.remove();
    let newMarkers = markers;
    newMarkers.splice(index, 1);
    setMarkers([...newMarkers]);
  };

  const getCoordinates = () => {
    return markers
      .map(item => `${item._lngLat.lng},${item._lngLat.lat}`)
      .join(";");
  };

  const getBounds = () => {
    return markers.map(item => [item._lngLat.lng, item._lngLat.lat]);
  };

  const fitBoundsMap = async () => {
    const bounds = await getBounds()
    console.log(bounds)
    mapManager.fitBounds(bounds);
  };

  const handleDirection = () => {
    fitBoundsMap();
    fetch(
      `${MAPBOX_API_HOST}${MAPBOX_DIRECTIONS}/mapbox/driving/${getCoordinates()}?geometries=geojson&access_token=${
        process.env.REACT_APP_MAPBOX_TOKEN
      }`
    )
      .then(response => {
        return response.json();
      })
      .then(data => {
        const route = data.routes[0].geometry.coordinates;
        const geojson = {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: route
          }
        };

        if (mapManager.getSource("route")) {
          mapManager.getSource("route").setData(geojson);
        } else {
          mapManager.addLayer({
            id: "route",
            type: "line",
            source: {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: geojson
                }
              }
            },
            layout: {
              "line-join": "round",
              "line-cap": "round"
            },
            paint: {
              "line-color": "#3887be",
              "line-width": 5,
              "line-opacity": 0.75
            }
          });
        }
      });
  };

  useEffect(() => {
    if (!mapManager) {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v10",
        center: [mapConfig.lng, mapConfig.lat],
        zoom: mapConfig.zoom,
        //hash: true,
        attributionControl: false,
        pitch: 40,
        renderWorldCopies: false
      });
      map.on("move", () => {
        setMapConfig({
          lng: map.getCenter().lng.toFixed(4),
          lat: map.getCenter().lat.toFixed(4),
          zoom: map.getZoom().toFixed(2)
        });
      });

      /* const GeolocateControl = new mapboxgl.GeolocateControl();
      GeolocateControl.on("error", error => {
        console.log(error);
      });
      map.addControl(GeolocateControl); */
      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }));
      map.addControl(
        new mapboxgl.ScaleControl({
          maxWidth: 80
        })
      );
      map.addControl(new mapboxgl.FullscreenControl());
      /* const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl
      });
      geocoder.addTo(map); */

      setMapManager(map);
    }
  }, [mapConfig.lat, mapConfig.lng, mapConfig.zoom, mapManager]);

  return (
    <div>
      <div id="searchContainer" className="searchSection">
        <AutoComplete
          dropdownMatchSelectWidth={252}
          style={{ width: 300 }}
          onSelect={onSelect}
          placeholder="search for location"
          onSearch={handleSearch}
          value={searchValue}
          onChange={handleChange}
          autoFocus
        >
          {options}
        </AutoComplete>
      </div>
      {markers.length && (
        <div className="markersSection">
          {markers.length > 1 && (
            <Button onClick={handleDirection}>Genera il percorso</Button>
          )}
          <List
            itemLayout="horizontal"
            dataSource={markers}
            renderItem={(item, index) => {
              return (
                <List.Item
                  actions={[
                    <Button onClick={() => removeMarker(item, index)}>
                      remove
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={item._popup._content.innerText}
                    description={`Longitudine: ${item._lngLat.lng}  |  Latitudine: ${item._lngLat.lat}`}
                  />
                </List.Item>
              );
            }}
          />
        </div>
      )}
      <div className="mapContainer" ref={mapContainer}></div>
      <div className="infoSection">
        <Alert
          message="Info Posizione"
          description={`Longitude: ${mapConfig.lng} | Latitude: ${mapConfig.lat} | Zoom: ${mapConfig.zoom}`}
          type="info"
        />
      </div>
    </div>
  );
};
