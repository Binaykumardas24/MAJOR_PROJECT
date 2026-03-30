import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import "../App.css";

// vector icons (simple, professional)
const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12 9a3 3 0 100 6 3 3 0 000-6z" />
    <path d="M4 7h4l2-2h4l2 2h4a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" />
  </svg>
);

const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
    <path d="M19 11a1 1 0 00-2 0 5 5 0 01-10 0 1 1 0 00-2 0 7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11z" />
  </svg>
);

const LocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
  </svg>
);

function Permissions() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
    screen: false,
    location: false
  });
  const [deniedPerm, setDeniedPerm] = useState({
    camera: false,
    microphone: false,
    location: false
  });
  // loading state per permission so we can show cursor/spinner
  const [loadingPerm, setLoadingPerm] = useState({
    camera: false,
    microphone: false,
    screen: false,
    location: false
  });
  const [requesting, setRequesting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioDb, setAudioDb] = useState(-Infinity);
  const micStreamRef = useRef(null);

  const resetPermissionsState = () => {
    setPermissions({ camera: false, microphone: false, screen: false, location: false });
    setDeniedPerm({ camera: false, microphone: false, location: false });
    setLoadingPerm({ camera: false, microphone: false, screen: false, location: false });
    setRequesting(false);
    setAudioLevel(0);
    setAudioDb(-Infinity);
    setLocationInfo(null);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
      setCameraStream(null);
    }
  };

  // when microphone permission granted, start capturing level
  React.useEffect(() => {
    if (!permissions.microphone) return;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          let values = 0;
          for (let i = 0; i < data.length; i++) values += data[i];
          const average = values / data.length / 255; // 0..1
          setAudioLevel(average);
          const db = 20 * Math.log10(average + 1e-6); // negative dB
          setAudioDb(db);
          requestAnimationFrame(tick);
        };
        tick();
      } catch {}
    })();
    return () => {
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [permissions.microphone]);
  const cameraStreamRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [locationInfo, setLocationInfo] = useState(null);

  // reset each time page opens
  React.useEffect(() => {
    resetPermissionsState();

    return () => {
      // ensure we don't keep permission streams alive when navigating away
      resetPermissionsState();
    };
  }, []);

  // helper to detect permanent denials and inform the user
  const checkPermissionStatus = async (name) => {
    if (navigator.permissions) {
      try {
        const p = await navigator.permissions.query({ name });
        if (p.state === "denied") {
          // browser won't show prompt again
          alert(
            `The ${name} permission has been blocked in your browser. ` +
              `Please enable it via the site settings (click the lock icon near the address bar) and retry.`
          );
          return false;
        }
      } catch {}
    }
    return true;
  };

  const requestCamera = async () => {
    // if the camera permission is already denied by browser settings, bail out early
    if (!(await checkPermissionStatus("camera"))) {
      setDeniedPerm((d) => ({ ...d, camera: true }));
      return;
    }

    setLoadingPerm((l) => ({ ...l, camera: true }));
    setDeniedPerm((d) => ({ ...d, camera: false }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setPermissions((p) => ({ ...p, camera: true }));
    } catch (err) {
      setDeniedPerm((d) => ({ ...d, camera: true }));
      // silent; state and UI already indicate denial
    } finally {
      setLoadingPerm((l) => ({ ...l, camera: false }));
    }
  };

  const requestMicrophone = async () => {
    if (!(await checkPermissionStatus("microphone"))) {
      setDeniedPerm((d) => ({ ...d, microphone: true }));
      return;
    }

    setLoadingPerm((l) => ({ ...l, microphone: true }));
    setDeniedPerm((d) => ({ ...d, microphone: false }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setPermissions((p) => ({ ...p, microphone: true }));
    } catch (err) {
      setDeniedPerm((d) => ({ ...d, microphone: true }));
    } finally {
      setLoadingPerm((l) => ({ ...l, microphone: false }));
    }
  };

  const requestScreen = async () => {
    setLoadingPerm((l) => ({ ...l, screen: true }));
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStream.getTracks().forEach((t) => t.stop());
      setPermissions((p) => ({ ...p, screen: true }));
    } catch (err) {
      console.log("Screen share permission denied (optional)");
    } finally {
      setLoadingPerm((l) => ({ ...l, screen: false }));
    }
  };

  const fetchAddress = async (lat, lng) => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      const data = await resp.json();
      // extract useful pieces if available
      const address = data.address || {};
      const display = data.display_name || "";
      setLocationInfo((l) => ({ ...l, address: display, city: address.city || address.town || address.village || "", state: address.state || "", postcode: address.postcode || "" }));
    } catch (e) {
      // ignore
    }
  };

  const requestLocation = () => {
    setLoadingPerm((l) => ({ ...l, location: true }));
    if (!navigator.geolocation) {
      alert("Geolocation not supported.");
      setLoadingPerm((l) => ({ ...l, location: false }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const lat = latitude.toFixed(4);
        const lng = longitude.toFixed(4);
        setLocationInfo({
          lat,
          lng,
          time: new Date().toLocaleString()
        });
        setPermissions((p) => ({ ...p, location: true }));
        fetchAddress(lat, lng);
        setLoadingPerm((l) => ({ ...l, location: false }));
      },
      (err) => {
        alert("Location permission denied.");
        setLoadingPerm((l) => ({ ...l, location: false }));
      }
    );
  };

  const requestPermissions = async () => {
    // deprecated combined flow still available
    setRequesting(true);
    try {
      await requestCamera();
      await requestMicrophone();
      await requestScreen();
    } finally {
      setRequesting(false);
    }
  };

  // navigation helpers for footer buttons
  const goHome = () => {
    resetPermissionsState();
    navigate("/");
  };
  const goBack = () => {
    resetPermissionsState();
    navigate(-1);
  };
  const goProceed = () => {
    if (allPermissionsGranted) {
      resetPermissionsState();
      navigate("/interview");
    }
  };

  const allPermissionsGranted = permissions.camera && permissions.microphone && permissions.location;

  // change cursor to wait when any permission is loading
  React.useEffect(() => {
    const anyLoading = Object.values(loadingPerm).some(Boolean);
    document.body.style.cursor = anyLoading ? "wait" : "default";
  }, [loadingPerm]);

  // compute audio bar color based on level
  const getAudioColor = (db) => {
    // use dB thresholds
    if (db < -18) return "#ef4444"; // too low
    if (db < -12) return "#facc15"; // okay
    if (db < -6) return "#10b981"; // good
    return "#059669"; // very loud
  };

  // camera preview when permission given
  React.useEffect(() => {
    if (permissions.camera) {
      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          cameraStreamRef.current = stream;
          setCameraStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.muted = true;
            videoRef.current.playsInline = true;
            await videoRef.current.play();
          }
        } catch {};
      })();
    }

    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;
      }
    };
  }, [permissions.camera]);

  // gather some system info for the right panel
  const [sysInfo, setSysInfo] = useState({
    os: navigator.platform || "Unknown",
    browser: navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge)\/?\s*(\d+)/)?.[1] || "Browser",
    dimension: `${window.innerWidth} x ${window.innerHeight}`,
    screen: `${window.screen.width} x ${window.screen.height}`,
    cookies: navigator.cookieEnabled ? "Enabled" : "Disabled",
    popup: "Enabled",
    download: "-- Mbps",
    upload: "-- Mbps",
    location: "--",
    time: new Date().toLocaleTimeString()
  });

  React.useEffect(() => {
    const measureSpeed = async () => {
      try {
        const start = Date.now();
        const resp = await fetch("https://via.placeholder.com/100?" + Math.random());
        const blob = await resp.blob();
        const duration = (Date.now() - start) / 1000;
        const bits = blob.size * 8;
        const mbps = (bits / duration / (1024 * 1024)).toFixed(2);
        setSysInfo((s) => ({ ...s, download: `${mbps} Mbps` }));
      } catch {}
    };

    const measureUpload = async () => {
      try {
        // send a blob of ~200KB to measure upload
        const size = 200 * 1024; // 200KB
        const data = new Uint8Array(size);
        window.crypto.getRandomValues(data);
        const blob = new Blob([data]);
        const start = Date.now();
        await fetch("https://jsonplaceholder.typicode.com/posts", {
          method: "POST",
          body: blob,
          headers: { "Content-Type": "application/octet-stream" }
        });
        const duration = (Date.now() - start) / 1000;
        const bits = blob.size * 8;
        const mbps = (bits / duration / (1024 * 1024)).toFixed(2);
        setSysInfo((s) => ({ ...s, upload: `${mbps} Mbps` }));
      } catch {}
    };

    measureSpeed();
    measureUpload();
    const speedInt = setInterval(() => {
      measureSpeed();
      measureUpload();
    }, 60000);
    const timeInt = setInterval(
      () => setSysInfo((s) => ({ ...s, time: new Date().toLocaleTimeString() })),
      1000
    );
    return () => {
      clearInterval(speedInt);
      clearInterval(timeInt);
    };
  }, []);

  // keep panel location synced when we obtain coords
  React.useEffect(() => {
    if (locationInfo) {
      setSysInfo((s) => ({ ...s, location: `${locationInfo.lat}, ${locationInfo.lng}` }));
    }
  }, [locationInfo]);

  // update the displayed time inside locationInfo every second
  React.useEffect(() => {
    if (!locationInfo) return;
    const int = setInterval(() => {
      setLocationInfo((l) => l ? { ...l, time: new Date().toLocaleString() } : l);
    }, 1000);
    return () => clearInterval(int);
  }, [locationInfo]);

  return (
    <div className="mock-page reveal">
      {/* No mini navbar on this page per request */}
      {/* overall status banner (only when every permission granted) */}
      {allPermissionsGranted && (
        <div style={{ background: "#e6ffed", padding: 20, textAlign: "center", color: "#065f46", fontWeight: 600 }}>
          ✅ Success: Your system is compatible. Please make sure to use the same System & Internet settings for your assessment/interview.
        </div>
      )}

      {/* main two‑column section */}
      <div style={{ display: "flex", flexWrap: "wrap", padding: 30, gap: 30, maxWidth: 1200, margin: "0 auto" }}>
        {/* left: system check list */}
        <div style={{ flex: "1 1 300px", maxWidth: 600 }}>
          <div style={{ background: "white", padding: 20, borderRadius: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
            <h2 style={{ marginTop: 0 }}>System Check + Verification Photo</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* camera */}
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <span className="perm-item" onClick={requestCamera} style={{cursor:'pointer'}}><CameraIcon className="perm-icon" /> Camera</span>
                <button
                  className={`mock-btn grant-btn ${permissions.camera ? "granted" : deniedPerm.camera ? "denied" : ""}`}
                  disabled={permissions.camera || loadingPerm.camera}
                  onClick={requestCamera}
                  style={{ cursor: loadingPerm.camera ? "wait" : "pointer" }}
                >
                  {loadingPerm.camera ? <span className="spinner" /> : permissions.camera ? "✓ Granted" : deniedPerm.camera ? "✕ Denied" : "Grant"}
                </button>
              </div>

              {/* microphone */}
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <span className="perm-item" onClick={requestMicrophone} style={{cursor:'pointer'}}><MicIcon className="perm-icon" /> Microphone</span>
                <button
                  className={`mock-btn grant-btn ${permissions.microphone ? "granted" : deniedPerm.microphone ? "denied" : ""}`}
                  disabled={permissions.microphone || loadingPerm.microphone}
                  onClick={requestMicrophone}
                  style={{ cursor: loadingPerm.microphone ? "wait" : "pointer" }}
                >
                  {loadingPerm.microphone ? <span className="spinner" /> : permissions.microphone ? "✓ Granted" : deniedPerm.microphone ? "✕ Denied" : "Grant"}
                </button>
              </div>
              {permissions.microphone && (
                <div style={{ marginTop: 8 }}>
                  <div className="audio-meter-container">
                    <div className="audio-meter">
                      {[...Array(10)].map((_, idx) => {
                        const thresholdDb = -30 + idx * ((-6 + 30) / 10);
                        const segColor = getAudioColor(thresholdDb);
                        return (
                          <div
                            key={idx}
                            className="audio-segment"
                            style={{ background: audioDb >= thresholdDb ? segColor : "#e5e7eb" }}
                          />
                        );
                      })}
                    </div>
                    <span className="audio-db-label">{audioDb.toFixed(1)} dB</span>
                  </div>
                </div>
              )}

              {/* browser */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>🌐 Browser</span>
                <span style={{ color: "#10b981", fontWeight: 700 }}>✓</span>
              </div>

              {/* network */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Your Network is Compatible</span>
                <span style={{ color: "#10b981", fontWeight: 700 }}>✓</span>
              </div>

              {/* location */}
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <span className="perm-item"><LocationIcon className="perm-icon" />Location</span>
                <button
                  className={`mock-btn grant-btn ${permissions.location ? "granted" : deniedPerm.location ? "denied" : ""}`}
                  disabled={permissions.location || loadingPerm.location}
                  onClick={requestLocation}
                  style={{ cursor: loadingPerm.location ? "wait" : "pointer" }}
                >
                  {loadingPerm.location ? <span className="spinner" /> : permissions.location ? "✓ Granted" : deniedPerm.location ? "✕ Denied" : "Grant"}
                </button>
              </div>
              {locationInfo && (
                <div style={{ marginTop: 8, fontSize: 13, color: "#444" }}>
                  <div>Lat: {locationInfo.lat}, Lng: {locationInfo.lng}</div>
                  <div>Time: {locationInfo.time}</div>
                  {locationInfo.address && (
                    <div style={{ marginTop: 4 }}>
                      <em>{locationInfo.address}</em>
                    </div>
                  )}
                  {(locationInfo.city || locationInfo.state || locationInfo.postcode) && (
                    <div style={{ marginTop: 4 }}>
                      {locationInfo.city && <span>City: {locationInfo.city} </span>}
                      {locationInfo.state && <span>State: {locationInfo.state} </span>}
                      {locationInfo.postcode && <span>Pincode: {locationInfo.postcode}</span>}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* right: video feed and info panels */}
        <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "white", padding: 10, borderRadius: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
            <video
              ref={videoRef}
              style={{ width: "100%", borderRadius: 6 }}
              autoPlay
              playsInline
              muted
            />
          </div>

          <div style={{ background: "white", padding: 20, borderRadius: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
            <h4>System Info</h4>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <div><strong>OS :</strong> {sysInfo.os}</div>
              <div><strong>Dimension :</strong> {sysInfo.dimension}</div>
              <div><strong>Browser :</strong> {sysInfo.browser}</div>
              <div><strong>Screen :</strong> {sysInfo.screen}</div>
              <div><strong>Cookies :</strong> {sysInfo.cookies}</div>
              <div><strong>Popup :</strong> {sysInfo.popup}</div>
              <div><strong>Location :</strong> {sysInfo.location}</div>
              <div><strong>Time :</strong> {sysInfo.time}</div>
            </div>
          </div>

          <div style={{ background: "white", padding: 20, borderRadius: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
            <h4>Internet Bandwidth</h4>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <div><strong>Download speed :</strong> {sysInfo.download}</div>
              <div><strong>Upload speed :</strong> {sysInfo.upload}</div>
            </div>
          </div>
        </div>
      </div>

      {/* footer buttons */}
      <div style={{ marginTop: 24, textAlign: "center", display: "flex", justifyContent: "center", gap: 12 }}>
        <button className="go-back-btn" onClick={goHome}>🏠 Home</button>
        <button className="go-back-btn" onClick={goBack}>← Back</button>
        <button className="mock-btn footer-btn" onClick={goProceed} disabled={!allPermissionsGranted}>
          Proceed
        </button>
      </div>
    </div>
  );
}

export default Permissions;
