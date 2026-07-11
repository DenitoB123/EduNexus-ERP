const asyncHandler = require('../shared/utils/asyncHandler');
const { success, created } = require('../shared/utils/apiResponse');
const authService = require('./auth.service');

const registerSchool = asyncHandler(async (req, res) => {
  const { schoolName, email, password, firstName, lastName, country, timezone } = req.body;
  const { school, owner } = await authService.registerSchool({
    schoolName,
    email,
    password,
    firstName,
    lastName,
    country,
    timezone,
  });

  return created(res, {
    message: 'School registered successfully. Continue to the Setup Wizard.',
    data: { school, owner: owner.toSafeJSON() },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password }, req);
  return success(res, { message: 'Login successful', data: result });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout({ refreshToken }, req);
  return success(res, { message: 'Logged out successfully' });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken({ refreshToken });
  return success(res, { message: 'Access token refreshed', data: result });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.forgotPassword({ email });
  // Generic message regardless of outcome — never confirm/deny account existence.
  return success(res, { message: 'If an account exists for this email, a reset link has been sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword({ token, newPassword });
  return success(res, { message: 'Password has been reset successfully. Please log in again.' });
});

const inviteUser = asyncHandler(async (req, res) => {
  const { email, roleId, campusId } = req.body;
  const { invitation } = await authService.inviteUser({
    schoolId: req.scope.schoolId,
    email,
    roleId,
    campusId,
    invitedBy: req.user.id,
  });

  const safeInvitation = invitation.toJSON();
  delete safeInvitation.token_hash;

  return created(res, { message: 'Invitation sent successfully', data: safeInvitation });
});

const acceptInvitation = asyncHandler(async (req, res) => {
  const { token, firstName, lastName, password } = req.body;
  const result = await authService.acceptInvitation({ token, firstName, lastName, password }, req);
  return created(res, { message: 'Invitation accepted. Welcome to EduNexus!', data: result });
});

module.exports = {
  registerSchool,
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  inviteUser,
  acceptInvitation,
};
