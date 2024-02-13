jest.mock('toolkit/extension/features/feature');
import {
  ReconcileAssistant,
  RECONCILE_ASSISTANT_MODAL_PORTAL,
  RECONCILE_ASSISTANT_CONTAINER_ID,
} from '../index';

describe('Reconcile Assistant', () => {
  it('should invoke correctly', () => {
    let extension = new ReconcileAssistant();
    expect(extension).toBeTruthy();
    expect(extension).toBeInstanceOf(ReconcileAssistant);
  });

  describe('invoke()', () => {
    let feature;

    beforeEach(() => {
      jest.useFakeTimers();
      feature = new ReconcileAssistant();
    });

    it('should invoke the correct methods', async () => {
      // Mock out the functions
      let shouldInvoke = jest.spyOn(feature, 'shouldInvoke').mockImplementation(() => {
        return true;
      });
      let _createFeatureContainerMock = jest.spyOn(feature, '_createFeatureContainer');
      let _createModalPortalMock = jest.spyOn(feature, '_createModalPortal');
      document.body.innerHTML = `<div id="${RECONCILE_ASSISTANT_CONTAINER_ID}"></div>`;
      expect(document.getElementById(RECONCILE_ASSISTANT_CONTAINER_ID).children.length).toBe(0);
      // Ensure each method has been called
      feature.invoke();
      expect(shouldInvoke).toHaveBeenCalledTimes(1);
      expect(shouldInvoke).toBeTruthy();

      // Resolve the set timeout
      jest.runOnlyPendingTimers();

      // React mounting is async, so wait a bit more for assistant to get mounted
      // TODO: would be good to replace it with react-testing-library
      jest.useRealTimers();
      await new Promise((r) => {
        setTimeout(r, 100);
      });
      jest.useFakeTimers();

      expect(_createFeatureContainerMock).toHaveBeenCalledTimes(1);
      expect(_createModalPortalMock).toHaveBeenCalledTimes(1);
      expect(document.querySelector('.button-primary.button')).toBeTruthy();

      // Ensure our component rendered with our button
      let container = document.getElementById(RECONCILE_ASSISTANT_CONTAINER_ID);
      expect(container.children.length).toBeTruthy();
      expect(container.children.length).toBe(1);
      expect(container.children[0].tagName).toBe('BUTTON');
      expect(container.children[0].textContent).toBe('Use Reconcile Assistant');
    });
  });

  describe('_createFeatureContainer()', () => {
    let feature;
    beforeEach(() => {
      feature = new ReconcileAssistant();
    });

    it('should append if not found', () => {
      document.body.innerHTML =
        "<div class='accounts-adjustment account-flash-notification'></div>";
      expect(document.getElementById(RECONCILE_ASSISTANT_CONTAINER_ID)).toBeFalsy();
      let element = document.querySelector('.accounts-adjustment.account-flash-notification');
      expect(element).toBeTruthy();
      expect(element.children.length).toBe(0);

      // Create the container
      feature._createFeatureContainer();
      let container = document.getElementById(RECONCILE_ASSISTANT_CONTAINER_ID);
      expect(container).toBeTruthy();
      expect(element.children.length).toBe(1);
      expect(container.className).toBe('tk-mg-r-1');

      // Call it again and check that we did not create again
      feature._createFeatureContainer();
      container = document.getElementById(RECONCILE_ASSISTANT_CONTAINER_ID);
      expect(container).toBeTruthy();
      expect(element.children.length).toBe(1);
      expect(container.className).toBe('tk-mg-r-1');
    });
  });

  describe('_attachInputListener()', () => {
    let feature;
    beforeEach(() => {
      feature = new ReconcileAssistant();
    });

    it('should do nothing if not found', () => {
      document.body.innerHTML =
        "<div class='modal-account-reconcile-enter-balance'>Has No Inputs<div>";
      let element = $('.modal-account-reconcile-enter-balance');
      expect(feature._reconcileInputValue).toBe('0');
      feature._attachInputListener();
      expect(element.length).toBe(1);
      expect(element.find('input').length).toBe(0);
      expect(feature._reconcileInputValue).toBe('0');
    });
  });

  describe('_createModalPortal()', () => {
    let feature;
    beforeEach(() => {
      feature = new ReconcileAssistant();
    });

    it('should do nothing if ynab not found', () => {
      document.body.innerHTML = "<div class='not-ember-application''>Invalid<div>";
      let portal = $(`#${RECONCILE_ASSISTANT_MODAL_PORTAL}`);
      feature._createModalPortal();
      portal = $(`#${RECONCILE_ASSISTANT_MODAL_PORTAL}`);
      expect(portal.length).toBe(0);
    });

    it('should do add only once if ynab is found', () => {
      document.body.innerHTML = "<div class='ember-application''>Valid<div>";

      // Add it once
      let portal = $(`#${RECONCILE_ASSISTANT_MODAL_PORTAL}`);
      feature._createModalPortal();
      portal = $(`#${RECONCILE_ASSISTANT_MODAL_PORTAL}`);
      expect(portal.length).toBe(1);

      // Add it again
      feature._createModalPortal();
      portal = $(`#${RECONCILE_ASSISTANT_MODAL_PORTAL}`);
      expect(portal.length).toBe(1);
    });
  });

  describe('observe()', () => {
    let feature;
    beforeEach(() => {
      feature = new ReconcileAssistant();
    });
    it('should attach an input listener', () => {
      let attachInputListenerMock = jest.spyOn(feature, '_attachInputListener');
      let invokeMock = jest.spyOn(feature, 'invoke');

      // Attach an input listener scenario
      let changedNodes = new Set();
      changedNodes.add('modal-account-reconcile-enter-balance');
      feature.observe(changedNodes);
      expect(attachInputListenerMock.mock.calls.length).toBe(1);
      expect(invokeMock.mock.calls.length).toBe(0);

      // Invoked scenario
      changedNodes.clear();
      changedNodes.add('accounts-adjustment-label user-data');
      feature.observe(changedNodes);
      expect(invokeMock.mock.calls.length).toBe(1);
      expect(attachInputListenerMock.mock.calls.length).toBe(1);

      // Nothing valid scenario
      changedNodes.clear();
      feature.observe(changedNodes);
      expect(invokeMock.mock.calls.length).toBe(1);
      expect(attachInputListenerMock.mock.calls.length).toBe(1);
    });
  });

  describe('shouldInvoke()', () => {
    let feature;
    let ynabUtils;
    beforeEach(() => {
      ynabUtils = require('toolkit/extension/utils/ynab');
      feature = new ReconcileAssistant();
    });

    it('should return invoke on accounts page', () => {
      let isCurrentRouteAccountsPageMock = jest
        .spyOn(ynabUtils, 'isCurrentRouteAccountsPage')
        .mockImplementation(() => {
          return true;
        });
      document.body.innerHTML = "<div class='accounts-header-reconcile'></div>";
      expect(feature.shouldInvoke()).toBeTruthy();
      expect(isCurrentRouteAccountsPageMock.mock.calls.length).toBe(1);
    });

    it('should return false if not on accounts page', () => {
      let isCurrentRouteAccountsPageMock = jest
        .spyOn(ynabUtils, 'isCurrentRouteAccountsPage')
        .mockImplementation(() => {
          return false;
        });
      document.body.innerHTML = "<div class='accounts-header-reconcile'></div>";
      expect(feature.shouldInvoke()).toBeFalsy();
      expect(isCurrentRouteAccountsPageMock.mock.calls.length).toBe(1);
    });

    it('should return false if element not present', () => {
      let isCurrentRouteAccountsPageMock = jest
        .spyOn(ynabUtils, 'isCurrentRouteAccountsPage')
        .mockImplementation(() => {
          return true;
        });
      document.body.innerHTML = "<div class='not-there-anymore'></div>";
      expect(feature.shouldInvoke()).toBeFalsy();
      expect(isCurrentRouteAccountsPageMock.mock.calls.length).toBe(0);
    });
  });
});
