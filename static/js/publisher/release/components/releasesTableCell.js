import React, { Fragment } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";

import { AVAILABLE } from "../constants";
import { getTrackingChannel } from "../releasesState";
import DevmodeIcon from "./devmodeIcon";
import { getChannelName, isInDevmode } from "../helpers";

import { toggleHistory } from "../actions/history";
import { undoRelease } from "../actions/pendingReleases";

import {
  getPendingChannelMap,
  getFilteredAvailableRevisionsForArch,
  hasPendingRelease
} from "../selectors";

const CloseChannelInfo = () => (
  <Fragment>
    <em>close channel</em>
    <span className="p-tooltip__message">Pending channel close</span>
  </Fragment>
);

const EmptyInfo = ({ isUnassigned, availableCount, trackingChannel }) => {
  return (
    <Fragment>
      {isUnassigned ? (
        <Fragment>
          <span className="p-release-data__info">
            <span className="p-release-data__title">Add revision</span>
            <span className="p-release-data__meta">
              {availableCount} available
            </span>
          </span>
        </Fragment>
      ) : (
        <Fragment>
          <span className="p-release-data__info--empty">
            {trackingChannel ? "↑" : "–"}
          </span>
        </Fragment>
      )}
      {!isUnassigned && (
        <span className="p-tooltip__message">
          {trackingChannel
            ? `Tracking channel ${trackingChannel}`
            : "Nothing currently released"}
        </span>
      )}
    </Fragment>
  );
};

EmptyInfo.propTypes = {
  isUnassigned: PropTypes.bool,
  availableCount: PropTypes.number,
  trackingChannel: PropTypes.string
};

const RevisionInfo = ({ revision, isPending, showVersion }) => {
  return (
    <Fragment>
      <span className="p-release-data__info">
        <span className="p-release-data__title">{revision.revision}</span>
        {isInDevmode(revision) && (
          <span className="p-release-data__icon u-float-right">
            <DevmodeIcon revision={revision} showTooltip={false} />
          </span>
        )}
        {showVersion && (
          <span className="p-release-data__meta">{revision.version}</span>
        )}
      </span>
      <span className="p-tooltip__message">
        {isPending && "Pending release of:"}

        <div className="p-tooltip__group">
          Revision: <b>{revision.revision}</b>
          <br />
          Version: <b>{revision.version}</b>
          {isInDevmode(revision) && (
            <Fragment>
              <br />
              {revision.confinement === "devmode" ? (
                <Fragment>
                  Confinement: <b>devmode</b>
                </Fragment>
              ) : (
                <Fragment>
                  Grade: <b>devel</b>
                </Fragment>
              )}
            </Fragment>
          )}
        </div>

        {isInDevmode(revision) && (
          <div className="p-tooltip__group">
            Revisions in devmode can’t be promoted
            <br />
            to stable or candidate channels.
          </div>
        )}
      </span>
    </Fragment>
  );
};

RevisionInfo.propTypes = {
  revision: PropTypes.object,
  isPending: PropTypes.bool,
  showVersion: PropTypes.bool
};

const ReleasesTableCell = props => {
  const {
    track,
    risk,
    arch,
    channelMap,
    pendingChannelMap,
    pendingCloses,
    filters
  } = props;

  const channel = getChannelName(track, risk);

  // current revision to show (released or pending)
  const currentRevision =
    pendingChannelMap[channel] && pendingChannelMap[channel][arch];

  // check if there is a pending release in this cell
  const hasPendingRelease = props.hasPendingRelease(channel, arch);

  const isChannelPendingClose = pendingCloses.includes(channel);
  const isPending = hasPendingRelease || isChannelPendingClose;
  const isUnassigned = risk === AVAILABLE;
  const isActive = filters && filters.arch === arch && filters.risk === risk;
  const isHighlighted = isPending || (isUnassigned && currentRevision);
  const trackingChannel = getTrackingChannel(channelMap, track, risk, arch);
  const availableCount = props.getAvailableCount(arch);

  const className = [
    "p-releases-table__cell is-clickable",
    isUnassigned ? "is-unassigned" : "",
    isActive ? "is-active" : "",
    isHighlighted ? "is-highlighted" : "",
    isPending ? "is-pending" : ""
  ].join(" ");

  function handleReleaseCellClick(arch, risk, track) {
    props.toggleHistoryPanel({ arch, risk, track });
  }

  function undoClick(revision, track, risk, event) {
    event.stopPropagation();
    props.undoRelease(revision, `${track}/${risk}`);
  }

  return (
    <div
      className={className}
      onClick={handleReleaseCellClick.bind(this, arch, risk, track)}
    >
      <div className="p-release-data p-tooltip p-tooltip--btm-center">
        {isChannelPendingClose ? (
          <CloseChannelInfo />
        ) : currentRevision ? (
          <RevisionInfo
            revision={currentRevision}
            isPending={hasPendingRelease}
            showVersion={props.showVersion}
          />
        ) : (
          <EmptyInfo
            isUnassigned={isUnassigned}
            availableCount={availableCount}
            trackingChannel={trackingChannel}
          />
        )}
      </div>
      {hasPendingRelease && (
        <div className="p-release-buttons">
          <button
            className="p-action-button p-tooltip p-tooltip--btm-center"
            onClick={undoClick.bind(this, currentRevision, track, risk)}
          >
            <i className="p-icon--close" />
            <span className="p-tooltip__message">
              Cancel promoting this revision
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

ReleasesTableCell.propTypes = {
  // state
  channelMap: PropTypes.object,
  filters: PropTypes.object,
  pendingCloses: PropTypes.array,
  pendingChannelMap: PropTypes.object,
  // compute state
  getAvailableCount: PropTypes.func,
  hasPendingRelease: PropTypes.func,
  // actions
  toggleHistoryPanel: PropTypes.func.isRequired,
  undoRelease: PropTypes.func.isRequired,
  // props
  track: PropTypes.string,
  risk: PropTypes.string,
  arch: PropTypes.string,
  showVersion: PropTypes.bool
};

const mapStateToProps = state => {
  return {
    channelMap: state.channelMap,
    filters: state.history.filters,
    pendingCloses: state.pendingCloses,
    pendingChannelMap: getPendingChannelMap(state),
    getAvailableCount: arch =>
      getFilteredAvailableRevisionsForArch(state, arch).length,
    hasPendingRelease: (channel, arch) =>
      hasPendingRelease(state, channel, arch)
  };
};

const mapDispatchToProps = dispatch => {
  return {
    toggleHistoryPanel: filters => dispatch(toggleHistory(filters)),
    undoRelease: (revision, channel) => dispatch(undoRelease(revision, channel))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReleasesTableCell);
