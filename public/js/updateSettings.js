/* eslint-disable */

import { showAlert } from './showAlert';
import axios from 'axios';

export const updateSettings = async (data, type) => {
  const url =
    type === 'data'
      ? '/api/v1/users/updateMe'
      : '/api/v1/users/updateMyPassword';
  try {
    const response = await axios({
      method: 'PATCH',
      url,
      data
    });
    if (response.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully..`);
    }
  } catch (ex) {
    console.log(ex.response.data);
    showAlert('error', ex.response.data.message);
  }
};
