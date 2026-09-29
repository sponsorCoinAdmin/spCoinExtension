// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/ReadOnlyMetaDataTable.tsx
//
// 2026-09-22, real migration — promoted verbatim from the web app's real
// components/shared/ReadOnlyMetaDataTable.tsx. Pure, fully-controlled
// presentational table, zero coupling of any kind.

'use client';

import React from 'react';
import { msTableTw } from './msTableTw';

const th = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-300/80';
const cell = 'px-3 py-3 text-sm align-middle';
const zebraA = 'bg-[rgba(56,78,126,0.35)]';
const zebraB = 'bg-[rgba(156,163,175,0.25)]';
const tableGrid = 'grid grid-cols-[max-content_minmax(0,1fr)]';

export interface MetaDataRow {
  label: string;
  value: React.ReactNode;
}

export interface ReadOnlyMetaDataTableProps {
  rows: MetaDataRow[];
  logoURL?: string;
  logoAlt?: string;
  logoVisible?: boolean;
  id?: string;
  className?: string;
  logoBackgroundClassName?: string;
  logoContainerClassName?: string;
  logoRoundedClassName?: string;
  logoContainerSizeClassName?: string;
  logoSizeClassName?: string;
}

export default function ReadOnlyMetaDataTable({
  rows,
  logoURL,
  logoAlt = '',
  logoVisible = true,
  id,
  className = '',
  logoBackgroundClassName = 'bg-[#11162A]',
  logoContainerClassName = 'p-2 bg-[#0b0e19] border border-black rounded-xl',
  logoRoundedClassName = 'rounded-full',
  logoContainerSizeClassName = 'w-fit mx-auto',
  logoSizeClassName = 'w-full max-w-[320px] aspect-square',
}: ReadOnlyMetaDataTableProps) {
  return (
    <div id={id} className={`flex flex-col gap-0 ${className}`}>
      {logoVisible && logoURL ? (
        <div className={`flex justify-center items-center ${logoContainerSizeClassName} ${logoContainerClassName}`}>
          <img
            src={logoURL}
            alt={logoAlt}
            className={`object-contain ${logoSizeClassName} ${logoRoundedClassName} ${logoBackgroundClassName}`}
          />
        </div>
      ) : null}

      <div className="scrollbar-hide mb-4 mt-0 w-full min-w-0 overflow-x-hidden overflow-y-auto rounded-xl border border-black">
        <div className={`w-full min-w-0 ${tableGrid}`}>
          <div className="contents">
            <div className={`${msTableTw.theadRow} ${th} whitespace-nowrap border-b border-black`}>
              Field Name
            </div>
            <div className={`${msTableTw.theadRow} ${th} border-b border-black`}>
              Value
            </div>
          </div>

          {rows.map(({ label, value }, index) => {
            const zebra = index % 2 === 0 ? zebraA : zebraB;
            const isLast = index === rows.length - 1;
            return (
              <div className="contents" key={label}>
                <div className={`${zebra} ${cell} whitespace-nowrap${isLast ? '' : ' border-b border-black'}`}>
                  {label}
                </div>
                <div className={`${zebra} ${cell} min-w-0 break-all${isLast ? '' : ' border-b border-black'}`}>
                  {value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
