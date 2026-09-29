// File: src/ConfigSponsorshipPanel.tsx
// Portable shell for SPONSOR_CONFIG_PANEL.
//
// Promoted out of the web app's components/views/TradingStationPanel/
// AddSponsorshipPanel/ConfigSponsorshipPanel/index.tsx (~259 lines).
//
// Portable here: the Sponsor/Recipient/Agent rate-slider state machine,
// the percentage derivation, the Agent-header-panel visibility sync, the
// expanded/collapsed toggle with pointer-down-vs-click distinction, the
// layout, and all presentation (pills, sliders, labels, close button).
// sponsorRateConfigStore + deriveSponsorRatePercentages live in
// @sponsorcoin/spcoin-exchange-engine (moved from the web app's
// lib/store/sponsorRateConfigStore.ts, same pattern as sponsorModeStore).
//
// Non-portable (injected as opaque props/slots, same pattern as
// StakingControllerPanel): rate-range bounds + annual-inflation rate come
// from ExchangeContext.settings.spCoinContract, so they are resolved by the
// caller and passed in. The "info" icon image (originally next/image +
// info_png) is an injected slot. The distribution-info message (originally
// useErrorMessage + openPanel(MESSAGE_PANEL)) is an onShowDistributionInfo
// callback. onClose is an injected close handler.
//
// Inline styles throughout (no Tailwind — the extension has no Tailwind
// pipeline), pixel-faithful to the real web app's structure.

'use client';

import React, { useEffect, useMemo, useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import {
  sponsorRateConfigStore,
  deriveSponsorRatePercentages,
  usePanelTree,
  usePanelVisible,
} from '@sponsorcoin/spcoin-exchange-engine';
import { PACKAGE_BUILD } from './packageBuildTag';
import TabBodyMarker from './TabBodyMarker';

const DEFAULT_RECIPIENT_RATE_RANGE: [number, number] = [0, 100];
const DEFAULT_AGENT_RATE_RANGE: [number, number] = [0, 100];

export interface ConfigSponsorshipPanelProps {
  panelId?: SP_COIN_DISPLAY;
  /** Rate-range bounds from the web app's exchangeContext.settings.spCoinContract. */
  recipientRateRange?: [number, number];
  agentRateRange?: [number, number];
  /** Annual inflation rate from exchangeContext.settings.spCoinContract. */
  annualInflationRate?: number;
  /** Injected info icon (web app: <Image src={info_png} />; extension: <img>). */
  infoIcon?: React.ReactNode;
  /** Opens MESSAGE_PANEL with distribution info (replaces useErrorMessage + openPanel). */
  onShowDistributionInfo?: () => void;
  /** Injected close handler (web app: closePanel(panelId)). */
  onClose?: () => void;
}

export default function ConfigSponsorshipPanel({
  panelId = SP_COIN_DISPLAY.SPONSOR_CONFIG_PANEL,
  recipientRateRange = DEFAULT_RECIPIENT_RATE_RANGE,
  agentRateRange = DEFAULT_AGENT_RATE_RANGE,
  annualInflationRate = 0,
  infoIcon,
  onShowDistributionInfo,
  onClose,
}: ConfigSponsorshipPanelProps) {
  const { setPanelVisible } = usePanelTree();
  const isVisible = usePanelVisible(panelId);

  const rateConfig = useSyncExternalStore(
    (cb) => sponsorRateConfigStore.subscribe(cb),
    () => sponsorRateConfigStore.getSnapshot(),
    () => sponsorRateConfigStore.getServerSnapshot(),
  );
  const sponsorStep = rateConfig.sponsorStep;
  const agentStep = rateConfig.agentStep;
  const setSponsorStep = useCallback((value: number) => sponsorRateConfigStore.setSponsorStep(value), []);
  const setAgentStep = useCallback((value: number) => sponsorRateConfigStore.setAgentStep(value), []);

  const [MIN_RECIPIENT_STEP, MAX_RECIPIENT_STEP] = recipientRateRange;
  const [MIN_AGENT_STEP, MAX_AGENT_STEP] = agentRateRange;

  const clampedSponsorStep = useMemo(
    () => Math.min(Math.max(sponsorStep, MIN_RECIPIENT_STEP), MAX_RECIPIENT_STEP),
    [sponsorStep, MIN_RECIPIENT_STEP, MAX_RECIPIENT_STEP],
  );

  const clampedAgentStep = useMemo(
    () => Math.min(Math.max(agentStep, MIN_AGENT_STEP), MAX_AGENT_STEP),
    [agentStep, MIN_AGENT_STEP, MAX_AGENT_STEP],
  );

  const { sponsorPct, recipientPct, agentPct } = useMemo(
    () => deriveSponsorRatePercentages(rateConfig, recipientRateRange, agentRateRange),
    [rateConfig, recipientRateRange, agentRateRange],
  );
  const recipientAgentPct = Number((recipientPct + agentPct).toFixed(2));
  const agentShareOfRecipientPct =
    recipientAgentPct !== 0 ? Number(((agentPct / recipientAgentPct) * 100).toFixed(2)) : 0;

  useEffect(() => {
    setPanelVisible(
      SP_COIN_DISPLAY.AGENT_HEADER_PANEL,
      agentPct !== 0,
      'ConfigSponsorshipPanel:agentPctSync',
    );
  }, [agentPct, setPanelVisible]);

  const [expanded, setExpanded] = useState(false);
  const sponsorStepAtPointerDownRef = useRef<number | null>(null);

  const handleSponsorSliderPointerDown = useCallback(() => {
    sponsorStepAtPointerDownRef.current = clampedSponsorStep;
  }, [clampedSponsorStep]);

  const handleSponsorSliderClick = useCallback(() => {
    if (sponsorStepAtPointerDownRef.current === clampedSponsorStep) {
      setExpanded((current) => !current);
    }
  }, [clampedSponsorStep]);

  const handleInfoClick = useCallback(() => {
    onShowDistributionInfo?.();
  }, [onShowDistributionInfo]);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleExpandRecipientAgent = useCallback(() => {
    setExpanded(false);
  }, []);

  const handleCollapseRecipientAgent = useCallback(() => {
    setExpanded((current) => !current);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      id={SP_COIN_DISPLAY[panelId]}
      style={{
        position: 'relative',
        backgroundColor: '#1f2639',
        color: '#94a3b8',
        border: 'none',
        height: expanded ? 123 : 90,
        borderRadius: 12,
      }}
    >
      <TabBodyMarker path="ConfigSponsorshipPanel.tsx" build={PACKAGE_BUILD} />

      <div id="recipient-config" />

      <div
        style={{
          position: 'absolute',
          top: 2,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 17,
          fontWeight: 'bold',
          color: '#c7d2fe',
        }}
        title="Rewards Prorated Every Second"
      >
        {`${annualInflationRate}% Annual Rewards Rate`}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 38,
          left: 10,
          fontSize: 14,
          color: '#94a3b8',
        }}
      >
        Staking Reward Distributions:
      </div>

      {infoIcon !== undefined && (
        <span
          style={{
            position: 'absolute',
            top: 38,
            left: 218,
            cursor: 'pointer',
          }}
          onClick={handleInfoClick}
        >
          {infoIcon}
        </span>
      )}

      <div
        style={{
          position: 'absolute',
          top: 33,
          right: 50,
          minHeight: 50,
          height: 28,
          backgroundColor: '#243056',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: 5,
          fontWeight: 'bold',
          fontSize: 17,
          paddingRight: 8,
        }}
        title={`${sponsorPct}% of Rewards Distribution`}
      >
        Sponsor:
        <div id="sponsorRatio">{sponsorPct}%</div>
      </div>

      <div
        id="closeSponsorConfig"
        style={{
          position: 'absolute',
          top: 33,
          right: 15,
          color: '#94a3b8',
          fontSize: 20,
          cursor: 'pointer',
        }}
        onClick={handleClose}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClose();
          }
        }}
        aria-label="Close sponsorship config"
      >
        X
      </div>

      {expanded ? (
        <div
          style={{
            position: 'absolute',
            top: 69,
            right: 50,
            minHeight: 50,
            height: 14,
            backgroundColor: '#243056',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 5,
            fontWeight: 'bold',
            fontSize: 17,
            paddingRight: 8,
            cursor: 'pointer',
          }}
          onClick={handleExpandRecipientAgent}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleExpandRecipientAgent();
            }
          }}
          aria-label="Collapse Recipient/Agent split"
          title={`${recipientPct}% of Rewards Distribution`}
        >
          Recipient:
          <div id="recipientRatio">{recipientPct}%</div>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            top: 69,
            right: 50,
            minHeight: 50,
            height: 14,
            backgroundColor: '#243056',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 5,
            fontWeight: 'bold',
            fontSize: 17,
            paddingRight: 8,
            cursor: 'pointer',
          }}
          onClick={handleCollapseRecipientAgent}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCollapseRecipientAgent();
            }
          }}
          aria-label="Expand Recipient/Agent split"
          title={`${recipientAgentPct}% of Rewards Distribution`}
        >
          {agentPct === 0 ? 'Recipient:' : 'Recipient/Agent:'}
          <div id="recipientAgentRatio">{recipientAgentPct}%</div>
        </div>
      )}

      <input
        type="range"
        title="Adjust Sponsor/Recipient Ratio — click the handle to expand/collapse the Recipient/Agent split"
        style={{
          position: 'absolute',
          top: 96,
          left: 11,
          marginTop: -20.5,
          border: 'none',
          height: 1.5,
          width: 224,
          borderRadius: 'none',
          outline: 'none',
          backgroundColor: 'white',
          cursor: 'pointer',
        }}
        min={MIN_RECIPIENT_STEP}
        max={MAX_RECIPIENT_STEP}
        value={clampedSponsorStep}
        onChange={(e) => setSponsorStep(Number(e.target.value))}
        onPointerDown={handleSponsorSliderPointerDown}
        onClick={handleSponsorSliderClick}
      />

      {expanded && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 93,
              right: 50,
              minHeight: 50,
              height: 24,
              backgroundColor: '#243056',
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: 5,
              fontWeight: 'bold',
              fontSize: 17,
              paddingRight: 8,
            }}
            title={`${agentPct}% of Rewards Distribution ( ${agentShareOfRecipientPct}% of Recipient Rewards )`}
          >
            Agent:
            <div id="agentRatio">{agentPct}%</div>
          </div>

          <input
            type="range"
            title="Adjust Recipient/Agent Ratio"
            style={{
              position: 'absolute',
              top: 126,
              left: 11,
              marginTop: -20.5,
              border: 'none',
              height: 1.5,
              width: 224,
              borderRadius: 'none',
              outline: 'none',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
            min={MIN_AGENT_STEP}
            max={MAX_AGENT_STEP}
            value={clampedAgentStep}
            onChange={(e) => setAgentStep(Number(e.target.value))}
          />
        </>
      )}
    </div>
  );
}
