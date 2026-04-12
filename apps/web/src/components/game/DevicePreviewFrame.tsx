/**
 * @clawgame/web - Device Preview Frame
 * Wraps the game canvas in a simulated device viewport for multi-device layout testing.
 * Part of M14: Playtest Lab + Publishing.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Smartphone, Tablet, Monitor, Maximize2, RotateCcw } from 'lucide-react';

export interface DeviceProfile {
  id: string;
  name: string;
  width: number;
  height: number;
  icon: React.ReactNode;
  category: 'phone' | 'tablet' | 'desktop';
}

export const DEVICE_PROFILES: DeviceProfile[] = [
  { id: 'responsive', name: 'Responsive', width: 0, height: 0, icon: <Maximize2 size={14} />, category: 'desktop' },
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667, icon: <Smartphone size={14} />, category: 'phone' },
  { id: 'iphone-15', name: 'iPhone 15', width: 393, height: 852, icon: <Smartphone size={14} />, category: 'phone' },
  { id: 'pixel-8', name: 'Pixel 8', width: 412, height: 915, icon: <Smartphone size={14} />, category: 'phone' },
  { id: 'ipad-mini', name: 'iPad Mini', width: 768, height: 1024, icon: <Tablet size={14} />, category: 'tablet' },
  { id: 'ipad-pro', name: 'iPad Pro 11"', width: 834, height: 1194, icon: <Tablet size={14} />, category: 'tablet' },
  { id: 'laptop', name: 'Laptop', width: 1280, height: 800, icon: <Monitor size={14} />, category: 'desktop' },
  { id: 'desktop', name: 'Desktop', width: 1920, height: 1080, icon: <Monitor size={14} />, category: 'desktop' },
];

interface DevicePreviewFrameProps {
  children: React.ReactNode;
}

export const DevicePreviewFrame: React.FC<DevicePreviewFrameProps> = ({ children }) => {
  const [selectedDevice, setSelectedDevice] = useState<DeviceProfile>(DEVICE_PROFILES[0]);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowDeviceMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Calculate scale to fit device frame within viewport
  useEffect(() => {
    const updateScale = () => {
      if (!viewportRef.current || selectedDevice.id === 'responsive') {
        setScale(1);
        return;
      }
      const vp = viewportRef.current.getBoundingClientRect();
      const padding = 40; // px margin around device frame
      const availW = vp.width - padding;
      const availH = vp.height - padding;
      const scaleX = availW / selectedDevice.width;
      const scaleY = availH / selectedDevice.height;
      setScale(Math.min(1, Math.min(scaleX, scaleY)));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (viewportRef.current) {
      observer.observe(viewportRef.current);
    }
    return () => observer.disconnect();
  }, [selectedDevice]);

  const isResponsive = selectedDevice.id === 'responsive';

  const handleSelect = useCallback((device: DeviceProfile) => {
    setSelectedDevice(device);
    setShowDeviceMenu(false);
  }, []);

  return (
    <div className="device-preview-wrapper">
      {/* Device selector toolbar */}
      <div className="device-preview-toolbar" ref={menuRef}>
        <button
          className="device-selector-btn"
          onClick={() => setShowDeviceMenu(!showDeviceMenu)}
          title={`Preview: ${selectedDevice.name}`}
        >
          {selectedDevice.icon}
          <span>{selectedDevice.name}</span>
          {isResponsive ? '' : <span className="device-dimensions">{selectedDevice.width}×{selectedDevice.height}</span>}
        </button>

        {showDeviceMenu && (
          <div className="device-menu">
            {(['phone', 'tablet', 'desktop'] as const).map(category => (
              <div key={category}>
                <div className="device-menu-category">{category === 'phone' ? '📱 Phones' : category === 'tablet' ? '📱 Tablets' : '🖥️ Desktop'}</div>
                {DEVICE_PROFILES.filter(d => d.category === category).map(device => (
                  <button
                    key={device.id}
                    className={`device-menu-item ${selectedDevice.id === device.id ? 'active' : ''}`}
                    onClick={() => handleSelect(device)}
                  >
                    {device.icon}
                    <span className="device-menu-item-name">{device.name}</span>
                    <span className="device-menu-item-dims">{device.width}×{device.height}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {!isResponsive && (
          <button
            className="device-rotate-btn"
            onClick={() => setSelectedDevice({
              ...selectedDevice,
              width: selectedDevice.height,
              height: selectedDevice.width,
            })}
            title="Rotate device"
          >
            <RotateCcw size={14} />
          </button>
        )}

        {!isResponsive && scale < 1 && (
          <span className="device-scale-label">{Math.round(scale * 100)}%</span>
        )}
      </div>

      {/* Canvas area with optional device frame */}
      <div className="device-preview-viewport" ref={viewportRef}>
        {isResponsive ? (
          <div className="device-frame-responsive">
            {children}
          </div>
        ) : (
          <div
            className={`device-frame device-frame-${selectedDevice.category}`}
            style={{
              width: selectedDevice.width,
              height: selectedDevice.height,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
            }}
          >
            {selectedDevice.category === 'phone' && (
              <div className="device-notch" />
            )}
            <div className="device-screen">
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
