const LICENSE_CHECK_PASSED_KEY = 'license_check_passed'

export function setLicenseCheckPassed() {
  sessionStorage.setItem(LICENSE_CHECK_PASSED_KEY, 'true')
}

export function clearLicenseCheckPassed() {
  sessionStorage.removeItem(LICENSE_CHECK_PASSED_KEY)
}

export function hasLicenseCheckPassed(): boolean {
  return sessionStorage.getItem(LICENSE_CHECK_PASSED_KEY) === 'true'
}
