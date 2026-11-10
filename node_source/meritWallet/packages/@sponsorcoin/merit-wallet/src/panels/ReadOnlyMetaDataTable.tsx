// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/ReadOnlyMetaDataTable.tsx
//
// 2026-09-22, real migration — promoted verbatim from the web app's real
// components/shared/ReadOnlyMetaDataTable.tsx. Pure, fully-controlled
// presentational table, zero coupling of any kind.

'use client';

import React from 'react';
import { msTableTw } from '@sponsorcoin/spcoin-panels';
import { metaTableClass } from '@sponsorcoin/spcoin-common/styles';


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
  logoBackgroundClassName = metaTableClass.logoBackground,
  logoContainerClassName = metaTableClass.logoContainer,
  logoRoundedClassName = metaTableClass.logoRounded,
  logoContainerSizeClassName = metaTableClass.logoContainerSize,
  logoSizeClassName = metaTableClass.logoSize,
}: ReadOnlyMetaDataTableProps) {
  const logoShown = logoVisible && !!logoURL;
  // 2026-11-09 (owner: no unnecessary wrappers): the table is ONE element; with no logo above it, it is all there is (the id and the class go on it)
  const table = (
    <div id={logoShown ? undefined : id} className={metaTableClass.table(metaTableClass.grid, logoShown ? '' : className)}>
      <div className={metaTableClass.contents}>
        <div className={metaTableClass.headCell(msTableTw.theadRow, metaTableClass.th, true)}>
          Field Name
        </div>
        <div className={metaTableClass.headCell(msTableTw.theadRow, metaTableClass.th, false)}>
          Value
        </div>
      </div>

      {rows.map(({ label, value }, index) => {
        const zebra = index % 2 === 0 ? metaTableClass.zebraA : metaTableClass.zebraB;
        const isLast = index === rows.length - 1;
        return (
          <div className={metaTableClass.contents} key={label}>
            <div className={metaTableClass.labelCell(zebra, metaTableClass.cell, isLast)}>
              {label}
            </div>
            <div className={metaTableClass.valueCell(zebra, metaTableClass.cell, isLast)}>
              {value}
            </div>
          </div>
        );
      })}
    </div>
  );
  if (!logoShown) return table;
  return (
    <div id={id} className={metaTableClass.root(className)}>
      <div className={metaTableClass.logoBox(logoContainerSizeClassName, logoContainerClassName)}>
        <img
          src={logoURL}
          alt={logoAlt}
          className={metaTableClass.logoImage(logoSizeClassName, logoRoundedClassName, logoBackgroundClassName)}
        />
      </div>
      {table}
    </div>
  );
}
