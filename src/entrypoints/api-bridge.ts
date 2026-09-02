import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { installPageFetchBridge } from '../integrations/echo/transport/bridge';

export { installPageFetchBridge } from '../integrations/echo/transport/bridge';

export default defineUnlistedScript(() => {
  installPageFetchBridge();
});
