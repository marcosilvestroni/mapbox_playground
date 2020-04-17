import React, { useEffect, useRef, useState, useCallback } from "react";
import "./App.css";
import mapboxgl from "mapbox-gl";
import { Alert, AutoComplete, List, Button, Collapse } from "antd";
import Firebase from './persistance/firebase'


mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
const MAPBOX_API_HOST = "https://api.mapbox.com/";
const MAPBOX_GEOCODING = "geocoding/v5/";
const MAPBOX_DIRECTIONS = "directions/v5";


function useMarkers() {
  const [markers, setMarkers] = useState

  useEffect(() => {
    //Firebase.firestore.
  })

  return markers
}



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
  const [message, setMessage] = useState();

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

  const addMarkers = useCallback(
    toAddMarkers => {
      setMarkers([...markers, ...toAddMarkers]);
    },
    [markers]
  );

  const onSelect = (value, option) => {
    setSearchValue(option.children);
    mapManager.flyTo({ center: value, zoom: 12 });
    const marker = new mapboxgl.Marker()
      .setLngLat(value)
      .setPopup(new mapboxgl.Popup().setText(option.children));

    marker.addTo(mapManager);
    addMarkers([marker]);
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
    let northeast = [];
    let southwest = [];

    markers.forEach(({ _lngLat }) => {
      if (northeast.length === 0) {
        northeast = [_lngLat.lng, _lngLat.lat];
        southwest = [_lngLat.lng, _lngLat.lat];
      } else {
        if (_lngLat.lat < southwest[1]) {
          southwest[1] = _lngLat.lat;
        }
        if (_lngLat.lat > northeast[1]) {
          northeast[1] = _lngLat.lat;
        }
        if (_lngLat.lng < southwest[0]) {
          southwest[0] = _lngLat.lng;
        }
        if (_lngLat.lng > northeast[0]) {
          northeast[0] = _lngLat.lng;
        }
      }
    });

    return [northeast, southwest];
  };

  const fitBoundsMap = async () => {
    const bounds = await getBounds();
    mapManager.fitBounds(bounds, { padding: 200 });
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
        if (data.code === "NoRoute") {
          setMessage(
            <Alert
              message="Errore"
              description={data.message}
              type="error"
              showIcon
            />
          );
        } else {
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
            mapManager.addSource("route", {
              type: "geojson",
              data: geojson
            });
            mapManager.addLayer({
              id: "route",
              type: "line",
              source: "route",
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

      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }));
      map.addControl(
        new mapboxgl.ScaleControl({
          maxWidth: 80
        })
      );

      map.addControl(new mapboxgl.FullscreenControl());

      setMapManager(map);
    }
  }, [addMarkers, mapConfig.lat, mapConfig.lng, mapConfig.zoom, mapManager]);

  if (message) {
    setTimeout(() => setMessage(null), 5000);
  }

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
      {markers.length > 0 && (
        <div className="markersSection">
          <Collapse defaultActiveKey={markers.length >= 2 ? ["1"] : []}>
            <Collapse.Panel
              key={"1"}
              showArrow={false}
              header="Dettaglio dei punti"
            >
              <Button onClick={fitBoundsMap}>Centra punti nella mappa</Button>
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
            </Collapse.Panel>
          </Collapse>
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
      <div className="messageSection">{message}</div>
    </div>
  );
};
