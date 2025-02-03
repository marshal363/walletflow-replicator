import { test, expect } from '@playwright/test';

test.describe('Add Wallet Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should properly transition to MultisigVaultFlow', async ({ page }) => {
    // 1. Initial State Check
    await test.step('Initial Dialog State', async () => {
      await page.click('button:has(svg[data-lucide="plus"])');
      const dialog = page.locator('div[role="dialog"]');
      await expect(dialog).toBeVisible();
      
      // Verify we're in the initial step
      await expect(page.locator('text=Add Wallet')).toBeVisible();
      await expect(page.locator('input[placeholder="Wallet name"]')).toBeVisible();
    });

    // 2. Fill Form and Verify State
    await test.step('Form Interaction', async () => {
      await page.fill('input[placeholder="Wallet name"]', 'Test Multisig Vault');
      await page.click('div:has-text("Best security for large amounts")');
      
      // Verify form state
      const input = await page.locator('input[placeholder="Wallet name"]');
      await expect(input).toHaveValue('Test Multisig Vault');
      
      // Verify selection state
      const multisigOption = page.locator('div:has-text("Best security for large amounts")');
      await expect(multisigOption).toHaveClass(/border-purple-500/);
    });

    // 3. Transition Check
    await test.step('Create Button Click', async () => {
      // Get initial dialog content for comparison
      const dialogBefore = await page.locator('div[role="dialog"]').innerHTML();
      console.log('Dialog content before click:', dialogBefore);

      // Click create and wait for potential state changes
      await page.click('button:has-text("Create")');
      
      // Wait for any animations
      await page.waitForTimeout(200);

      // Get dialog content after click
      const dialogAfter = await page.locator('div[role="dialog"]').innerHTML();
      console.log('Dialog content after click:', dialogAfter);
      
      // Check if dialog is still visible
      await expect(page.locator('div[role="dialog"]')).toBeVisible();
      
      // Verify we've transitioned to MultisigVaultFlow
      await expect(page.locator('text=A Vault is a 2-of-3 multisig wallet')).toBeVisible();
    });

    // 4. MultisigVaultFlow State Check
    await test.step('MultisigVaultFlow Initial State', async () => {
      // Verify the step indicator is visible
      await expect(page.locator('div.flex.items-center.justify-center.gap-1')).toBeVisible();
      
      // Verify the intro content
      await expect(page.locator('text=It needs 2 vault keys to spend')).toBeVisible();
      
      // Verify the "Let's start" button is enabled
      const startButton = page.locator('button:has-text("Let\'s start")');
      await expect(startButton).toBeEnabled();
    });

    // 5. Navigation Through Steps
    await test.step('Step Navigation', async () => {
      // Click "Let's start" and verify transition to quorum step
      await page.click('button:has-text("Let\'s start")');
      await expect(page.locator('text=Vault Settings')).toBeVisible();
      
      // Try to modify quorum settings
      await page.click('text=▲');
      
      // Verify settings change
      await expect(page.locator('text=3').first()).toBeVisible();
      
      // Click create and verify transition to keys step
      await page.click('button:has-text("Create")');
      await expect(page.locator('text=Vault Key 1')).toBeVisible();
    });

    // 6. Back Navigation Check
    await test.step('Back Navigation', async () => {
      // Click back button
      await page.click('button:has(svg[data-lucide="chevron-left"])');
      
      // Verify we're back to quorum step
      await expect(page.locator('text=Vault Settings')).toBeVisible();
      
      // Verify quorum settings were maintained
      await expect(page.locator('text=3').first()).toBeVisible();
    });

    // 7. Component State Persistence
    await test.step('State Persistence', async () => {
      // Navigate back to initial step
      await page.click('button:has(svg[data-lucide="chevron-left"])');
      
      // Verify we're at intro
      await expect(page.locator('text=A Vault is a 2-of-3 multisig wallet')).toBeVisible();
      
      // Go forward again
      await page.click('button:has-text("Let\'s start")');
      
      // Verify quorum settings still persist
      await expect(page.locator('text=3').first()).toBeVisible();
    });
  });
}); 