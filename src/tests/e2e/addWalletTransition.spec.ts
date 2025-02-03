import { test, expect } from '@playwright/test';

test.describe('Add Wallet Transition Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should debug the transition to MultisigVaultFlow', async ({ page }) => {
    // Debug: Track component state changes
    await page.evaluate(() => {
      window.addEventListener('error', console.error);
      window.addEventListener('unhandledrejection', console.error);
    });

    // 1. Open Dialog and Verify Initial Render
    await test.step('Initial Render Check', async () => {
      await page.click('button:has(svg[data-lucide="plus"])');
      
      // Debug: Check dialog structure
      const dialogStructure = await page.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"]');
        return dialog ? dialog.innerHTML : 'Dialog not found';
      });
      console.log('Initial Dialog Structure:', dialogStructure);
      
      await expect(page.locator('div[role="dialog"]')).toBeVisible();
    });

    // 2. Fill Form with Debug Checks
    await test.step('Form State Debug', async () => {
      // Debug: Check form interactivity
      const isInputInteractive = await page.evaluate(() => {
        const input = document.querySelector('input[placeholder="Wallet name"]');
        return input ? !input.hasAttribute('disabled') : false;
      });
      console.log('Input Interactive:', isInputInteractive);

      await page.fill('input[placeholder="Wallet name"]', 'Test Multisig Vault');
      await page.click('div:has-text("Best security for large amounts")');

      // Debug: Verify state updates
      const formState = await page.evaluate(() => {
        const input = document.querySelector('input[placeholder="Wallet name"]') as HTMLInputElement;
        const selected = document.querySelector('.border-purple-500');
        return {
          inputValue: input?.value,
          hasSelection: !!selected
        };
      });
      console.log('Form State:', formState);
    });

    // 3. Debug Create Button Click
    await test.step('Create Button Debug', async () => {
      // Debug: Check button state
      const buttonState = await page.evaluate(() => {
        const button = document.querySelector('button:has-text("Create")') as HTMLButtonElement;
        return {
          disabled: button?.disabled,
          visible: button?.offsetParent !== null
        };
      });
      console.log('Create Button State:', buttonState);

      // Debug: Monitor state changes during click
      await page.evaluate(() => {
        const originalSetState = window.React.useState;
        window.React.useState = function(...args) {
          const [state, setState] = originalSetState(...args);
          return [
            state,
            (...newState) => {
              console.log('State Update:', newState);
              return setState(...newState);
            }
          ];
        };
      });

      // Click with animation frame monitoring
      await page.evaluate(() => {
        let frameCount = 0;
        const checkFrames = () => {
          frameCount++;
          if (frameCount < 30) { // Monitor for 30 frames
            console.log('Animation Frame:', frameCount);
            requestAnimationFrame(checkFrames);
          }
        };
        requestAnimationFrame(checkFrames);
      });

      await page.click('button:has-text("Create")');
    });

    // 4. Debug Transition
    await test.step('Transition Debug', async () => {
      // Wait for any animations
      await page.waitForTimeout(200);

      // Debug: Check component mounting
      const componentState = await page.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"]');
        const multisigContent = dialog?.querySelector('div:has-text("A Vault is a 2-of-3 multisig wallet")');
        return {
          dialogVisible: !!dialog?.offsetParent,
          multisigMounted: !!multisigContent,
          dialogClasses: dialog?.className,
          contentStructure: dialog?.innerHTML
        };
      });
      console.log('Component State After Transition:', componentState);

      // Verify expected state
      await expect(page.locator('div[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=A Vault is a 2-of-3 multisig wallet')).toBeVisible();
    });

    // 5. Debug Animation State
    await test.step('Animation State Debug', async () => {
      // Monitor animation classes
      const animationState = await page.evaluate(() => {
        const elements = document.querySelectorAll('[class*="motion"]');
        return Array.from(elements).map(el => ({
          classes: el.className,
          computedStyle: window.getComputedStyle(el),
          rect: el.getBoundingClientRect()
        }));
      });
      console.log('Animation State:', animationState);
    });

    // 6. Debug Event Handling
    await test.step('Event Handling Debug', async () => {
      // Try to interact with MultisigVaultFlow
      await page.click('button:has-text("Let\'s start")');
      
      // Debug: Check event propagation
      const eventHandling = await page.evaluate(() => {
        const button = document.querySelector('button:has-text("Let\'s start")');
        return {
          hasListeners: !!button?.__handlers,
          buttonEnabled: !button?.hasAttribute('disabled'),
          buttonVisible: button?.offsetParent !== null
        };
      });
      console.log('Event Handling State:', eventHandling);
    });
  });
}); 