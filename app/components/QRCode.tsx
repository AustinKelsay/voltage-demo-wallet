"use client";

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRProps {
  data: string;
  size?: number;
  className?: string;
}

const QRCode: React.FC<QRProps> = ({ data, size = 200, className = '' }) => {
  return (
    <div className={className}>
      <div className="flex justify-center">
        <QRCodeSVG 
          value={data} 
          size={size}
          bgColor={"#ffffff"}
          fgColor={"#000000"}
          level={"L"}
          includeMargin={false}
        />
      </div>
      <div className="text-center text-xs mt-2 text-gray-500">
        Scan with a Lightning wallet
      </div>
    </div>
  );
};

export default QRCode; 