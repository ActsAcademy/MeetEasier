import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as config from '../../config/singleRoom.config.js';

import RoomStatusBlock from './RoomStatusBlock';
import Sidebar from './Sidebar';
import Socket from '../global/Socket';
import Spinner from '../global/Spinner';

class Display extends Component {
  constructor(props) {
    super(props);
    this.state = {
      response: false,
      roomAlias: this.props.alias,
      rooms: [],
      room: [],
      roomDetails: {
        appointmentExists: false,
        timesPresent: false,
        upcomingAppointments: false,
        nextUp: ''
      }
    }
    // track last known busy state to avoid redundant LED calls
    this._ledIsBusy = null;
  }

  getRoomsData = () => {
    return fetch('/api/rooms')
      .then((response) => response.json())
      .then((data) => {
        this.setState({
          rooms: data
        }, () => this.processRoomDetails());
      })
  }

  processRoomDetails = () => {
    const { rooms, roomAlias } = this.state;

    let roomArray = rooms.filter(item => item.RoomAlias === roomAlias);
    let room = roomArray[0];

    // If no room matched the alias, ensure we don't try to read properties
    // off `undefined` later in render. Provide a safe default and clear
    // any appointment flags.
    if (!room) {
      this.setState({
        response: true,
        room: {},
        roomDetails: {
          appointmentExists: false,
          timesPresent: false,
          upcomingAppointments: false,
          nextUp: ''
        }
      }, () => {
        // ensure LEDs reflect that the room is not busy
        try {
          this.updateLedForRoom(null);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('LED update failed', e);
        }
      });
      return;
    }

    // 1) ensure that appointments exist for the room
    // 2) check if there are more than 1 upcoming appointments
    // 3) check if there are times in the room.Start & room.End
    // 4) if the meeting is not going on now, append "Next Up: "
    if (typeof room.Appointments !== 'undefined' && room.Appointments.length > 0) {
      this.setState(prevState => ({
        roomDetails: {
          ...prevState.roomDetails,
          appointmentExists: true
        }
      }));

      if (room.Appointments.length > 1) {
        this.setState(prevState => ({
          roomDetails: {
            ...prevState.roomDetails,
            upcomingAppointments: true
          }
        }));
      }

      if (room.Appointments[0].Start && room.Appointments[0].End) {
        this.setState(prevState => ({
          roomDetails: {
            ...prevState.roomDetails,
            timesPresent: true
          }
        }));

        if (!room.Busy) {
          this.setState(prevState => ({
            roomDetails: {
              ...prevState.roomDetails,
              nextUp: config.nextUp + ': '
            }
          }));
        }
        else {
          this.setState(prevState => ({
            roomDetails: {
              ...prevState.roomDetails,
              nextUp: ''
            }
          }));
        }
      }
    }

    this.setState({
      response: true,
      room: room
    }, () => {
      // Update LEDs based on room occupancy. Use a small internal guard
      // to avoid repeated POSTs for the same state. Always attempt to
      // set LEDs to green if room is missing or not busy.
      try {
        this.updateLedForRoom(room);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('LED update failed', e);
      }
    });
  }

  updateLedForRoom = (room) => {
    const isBusy = !!(room && room.Busy);

    // If state hasn't changed, skip network call
    if (this._ledIsBusy === isBusy) return;

    this._ledIsBusy = isBusy;

    if (isBusy) {
      // busy -> red
      // eslint-disable-next-line no-console
      console.log('Setting LEDs -> RED (busy)');
      this.setFrontLedColor(255, 0, 0);
      this.setLedBarsColor(255, 0, 0);
    } else {
      // free/missing -> green
      // eslint-disable-next-line no-console
      console.log('Setting LEDs -> GREEN (free)');
      this.setFrontLedColor(0, 255, 0);
      this.setLedBarsColor(0, 255, 0);
    }
  }

  setFrontLedColor = (r, g, b) => {
    return fetch('http://localhost:8080/v1/led/front_led', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ red: r, green: g, blue: b })
    }).then(res => {
      if (!res.ok) throw new Error('LED server responded ' + res.status);
      return res;
    }).catch(err => {
      // eslint-disable-next-line no-console
      console.warn('setFrontLedColor error', err);
    });
  }

  setLedBarsColor = (r, g, b) => {
    return fetch('http://localhost:8080/v1/led/led_bars', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ red: r, green: g, blue: b })
    }).then(res => {
      if (!res.ok) throw new Error('LED server responded ' + res.status);
      return res;
    }).catch(err => {
      // eslint-disable-next-line no-console
      console.warn('setLedBarsColor error', err);
    });
  }

  handleSocket = (socketResponse) => {
    this.setState({
      response: socketResponse.response,
      rooms: socketResponse.rooms
    }, () => this.processRoomDetails());
  }

  componentDidMount = () => {
    this.getRoomsData();
  };

  render() {
    const { response, room, roomDetails } = this.state;

    return (
      <div>
        <Socket response={this.handleSocket}/>

        { response ?
          <div className="row expanded full-height">
            <RoomStatusBlock room={room} details={roomDetails} config={config} />
            <Sidebar room={room} details={roomDetails} config={config} />
          </div>
        :
          <Spinner />
        }
      </div>
    );
  }
}

Display.propTypes = {
  alias: PropTypes.string
}

export default Display;
