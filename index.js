const puppeteer = require("puppeteer");
const axios = require("axios");
require("dotenv").config();

const loginId = process.env.LOGIN_ID;
const password = process.env.PASSWORD;
const baseURL = process.env.BASE_URL;
//----------------------------------Test data----------------------//
const operation = "FETCH";
const account = "Nua (Prepaid)";
const timeFrame = "duration=2023-11-01_2023-11-15";
const campaignName = "Auto - Brand - CC";


//const reports = ["ba","pla","pca"];
//----------------------------------Test data----------------------//
(async () => {
  const browser = await puppeteer.launch({ headless: "new" }); // Set headless to false for a visible browser
  const page = await browser.newPage();
  const newActions = await getNewActions();
  if (newActions && newActions.data) {
    // login in
    await loginToFlipkartPortal(page);

    // skip intro if there
    await introSkip(page);

    let accountElement = await findAccount(page, account);

    if (accountElement.length > 0) {
      await accountElement[0].click();
      await sleep(3000);
    } else {
      console.error(`Span with text ${account} not found`);
    }

    if (operation == "FETCH") {
      // navigate to reports
      await navigateToCampaignMgr(page);
      //await collectReportsData(page);
      //await toggleLiveReportSwitch(page);
      await pauseCampaign(page,campaignName);
    } else if (operation == "UPDATE") {
      await navigateToCampaignMgr(page);
      //await pullStats(page);
      //await updateCampaignBudget(page,campaignName);
    }
    // Close the browser
    console.log("Completed the task exiting now.");
  }
  // // await browser.close();
})();

const loginToFlipkartPortal = async (page) => {
  try {
    // Navigate to the login page
    await page.goto(baseURL); // Replace with the actual URL of the login page

    // Wait for the login form to be available
    await page.waitForSelector('input[placeholder="Enter email"]'); // Adjust the selector based on your login form

    // Enter the login credentials
    await page.type('input[placeholder="Enter email"]', loginId); // Replace with your actual email
    await page.type('input[placeholder="Enter password"]', password); // Replace with your actual password

    // Submit the login form
    await page.click('button[type="submit"]'); // Adjust the selector based on your login form

    // Wait for the page to load after login
    await page.waitForNavigation();
    console.log("Successfully logged in to the portal");
    return true;
  } catch (e) {
    console.log("Error while logging in ", e);
    return false;
  }
};

const getNewActions = async () => {
  try {
    // Make a new API call (replace the URL with your actual API endpoint)
    //const response = await axios.get('https://example.com/api/actions');

    // Mocked response for now
    const mockedResponse = {
      data: {
        action: {
          campaignName: "Auto - Brand - CC",
          name: "Budget Increase",
          campaignBudget: 120,
        },
      },
    };

    // Return the mocked response for testing purposes
    return mockedResponse;
  } catch (error) {
    // Handle errors if the API call fails
    console.error("Error in API call:", error.message);
    throw error;
  }
};

const navigateToReports = async (page) => {
  // skip intro if there
  await introSkip(page);
  try {
    // Get the current URL
    const currentUrl = await page.url();
    const urlObject = new URL(currentUrl);
    urlObject.pathname = "ad-account/reports/ba";

    // Navigate to the modified URL
    await page.goto(urlObject.toString());
    await sleep(3000);
    // Add any additional logic or checks needed for the reports page

    console.log("Successfully navigated to the reports page");
    return true; // Indicate success
  } catch (error) {
    console.error("Error navigating to reports page:", error.message);
    return false; // Indicate failure
  }
};

const navigateToCampaignMgr = async (page) => {
  // skip intro if there
  await introSkip(page);
  try {
    // Get the current URL
    const currentUrl = await page.url();
    const urlObject = new URL(currentUrl);

    // Check if "/campaigns" is already in the pathname
    if (urlObject.pathname.includes("/campaigns")) {
      console.log("On Campaign Page");
      return true; // Already on the campaign page
    }

    // Append "/campaigns" to the pathname
    urlObject.pathname = "ad-account/campaigns";

    // Navigate to the modified URL
    await page.goto(urlObject.toString());
    await sleep(3000);
    // Add any additional logic or checks needed for the campaigns page

    console.log("Successfully navigated to the campaign page");
    return true; // Indicate success
  } catch (error) {
    console.error("Error navigating to campaign page:", error.message);
    return false; // Indicate failure
  }
};

const sleep = async (waitTime) => {
  await new Promise((resolve) => setTimeout(resolve, waitTime));
};

const introSkip = async (page) => {
  try {
    const introElement = await page.$x(`//button[contains(., "Got it!")]`);
    if (introElement) {
      await introElement[0].click();
      console.log("Skipping intro..");
      await sleep(1000);
    }
    return true;
  } catch (e) {
    console.log("Intro not present");
  } finally {
    return true;
  }
};

const collectReportsData = async (page) => {
  try {
    const currentUrl = await page.url();
    const urlObject = new URL(currentUrl);

    // Append "/reports" to the pathname
    urlObject.searchParams.set("duration", timeFrame);

    // Navigate to the modified URL
    await page.goto(urlObject.toString());

    // Skip intro
    await introSkip(page);

    // Wait for the navigation tabs container
    await page.waitForSelector("div.mHCah");
    console.log("Found the navigation tabs");
    await introSkip(page);
    // Select all buttons inside div.mHCah
    const buttons = await page.$$("div.mHCah button");
    // Loop through each button
    for (const button of buttons) {
      // Get and log the text of the button
      const buttonText = await page.evaluate(
        (element) => element.textContent,
        button
      );
      // Click the button
      await button.click();
      await sleep(5000);
      // Wait for 3 seconds
      console.log("wait completed");
      console.log(`Fetching data for report ${buttonText}`);
      // Wait for pullStats to complete before moving on
      await pullStats(page);

      console.log(`Completed fetching data for report ${buttonText}`);
    }

    console.log("Clicked all buttons and waited for 10 seconds each");
    return true;
  } catch (error) {
    console.error("Error in collectReportsData:", error.message);
    return false;
  }
};

const pullStats = async (page) => {
  // Use evaluate to run the function within the browser context
  const jsonData = await page.evaluate(() => {
    const pfDataTable = document.querySelector("pf-data-table");
    const shadowRoot = pfDataTable.shadowRoot;

    // Select the table element inside the shadow DOM
    const table = shadowRoot.querySelector("table");

    // Initialize an array to store the table data
    const tableData = [];

    // Get the table headers (header row)
    const headerRows = table.querySelectorAll("thead tr");
    const headerCells = headerRows[0].querySelectorAll("th");

    // Create an array to store the column headers, including parent-child relationships
    const headers = [];

    headerCells.forEach((cell) => {
      const spanElements = cell.querySelectorAll("span");

      if (spanElements.length > 1) {
        // If there are multiple spans, create parent-child relationships
        for (let i = 1; i < spanElements.length; i++) {
          const headerText = cell.textContent.trim();
          const spanText = spanElements[i].textContent.trim();
          headers.push(`${headerText} - ${spanText}`);
        }
      } else {
        headers.push(cell.textContent.trim());
      }
    });

    // Select all the rows in the table (excluding the header)
    const dataRows = table.querySelectorAll("tbody tr");

    // Iterate through the data rows and collect their cell data
    dataRows.forEach((row) => {
      const rowData = {};
      const cells = row.querySelectorAll("td");

      cells.forEach((cell, index) => {
        const header = headers[index];
        let cellText = cell.textContent.trim();

        // Check if the cell contains a <slot> element
        const slotElement = cell.querySelector("slot");
        if (slotElement) {
          // Get the slot attribute value from the <slot> element
          const slotName = slotElement.getAttribute("name");
          if (slotName) {
            // Find the <div slot="${slotName}"> element in the shadow DOM
            const divSlotElement = pfDataTable.querySelector(
              `div[slot="${slotName}"]`
            );
            if (divSlotElement) {
              // Try to get the text value from the <a> element inside the div
              const linkElement = divSlotElement.querySelector("a");
              if (linkElement) {
                cellText = cellText + " " + linkElement.textContent.trim();
              } else {
                // If no <a> element found, use the text from the <div> element
                cellText = divSlotElement.textContent.trim();
              }
            }
          }
        }

        rowData[header] = cellText;
      });

      // Add the row data to the tableData array
      tableData.push(rowData);
    });

    // Return the table data
    return tableData;
  });

  // Create a JSON representation of the table data
  const jsonDataString = JSON.stringify(jsonData, null, 2);
  console.log(jsonDataString);
  return true;
};

const updateCampaignBudget = async (page, campaignName) => {
  await introSkip(page);
  const jsonData = await page.evaluate(() => {
    const pfDataTable = document.querySelector("pf-data-table");
    const shadowRoot = pfDataTable.shadowRoot;
    // Select the table element inside the shadow DOM
    const table = shadowRoot.querySelector("table");

    // Select all the rows in the table (excluding the header)
    const dataRows = table.querySelectorAll("tbody tr");

    let found = false;
    //Iterate through the data rows and collect their cell data
    dataRows.forEach((row) => {
      if (found) {
        return; // Break the loop if the target campaign has been found
      }
      const cells = row.querySelectorAll("td");

      cells.forEach((cell, index) => {
        let cellText = cell.textContent.trim();

        // Check if the cell contains a <slot> element
        const slotElement = cell.querySelector("slot");
        if (slotElement) {
          // Get the slot attribute value from the <slot> element
          const slotName = slotElement.getAttribute("name");
          if (slotName) {
            // Find the <div slot="${slotName}"> element in the shadow DOM
            const divSlotElement = pfDataTable.querySelector(
              `div[slot="${slotName}"]`
            );
            if (divSlotElement) {
              // Try to get the text value from the <a> element inside the div
              const linkElement = divSlotElement.querySelector("a");
              if (linkElement) {
                cellText = cellText + " " + linkElement.textContent.trim();
              } else {
                // If no <a> element found, use the text from the <div> element
                cellText = divSlotElement.textContent.trim();
              }
              if (cellText.includes("Auto - Brand - CC")) {
                found = true;
                let budgetSlotName = slotName.split("-")[0] + "-" + 3;
                const divSlotElement = pfDataTable.querySelector(
                  `div[slot="${budgetSlotName}"]`
                );
                console.log(divSlotElement);
                let editButton = divSlotElement.querySelector(
                  ".styles__EditIcon-sc-13tmvzh-13"
                );
                console.log(editButton);
                var clickEvent = new Event("click", {
                  bubbles: true,
                  cancelable: false,
                });
                editButton.dispatchEvent(clickEvent);
                console.log("Clicked on budget edit icon");
                // Click on the identified element
                return;
              }
            }
          }
        }
      });
    });
  });
  // Wait for the popover to appear
  await page.waitForSelector("#popover-content");

  // Clear the input field
  await page.focus('#popover-content input[type="number"]');

  // Simulate pressing 'Ctrl+A' to select all text
  await page.keyboard.down("Control");
  await page.keyboard.press("A");
  await page.keyboard.up("Control");

  // Simulate pressing 'Backspace' to clear the input
  await page.keyboard.press("Backspace");

  await sleep(5000);
  // Input value in the text box
  await page.type('#popover-content input[type="number"]', "100");
  console.log("Entered Budget Increase value 100");
  await sleep(5000);
  await page.evaluate(() => {
    const button = document.querySelectorAll("#popover-content button")[1];
    if (button) {
      button.click();
    }
  });

  console.log("Updated campaign budget");
  return;
};

const findAccount = async (page, account) => {
  // Click on the div with class 'styles__StyledRightContainer-sc-15k3kqb-0'
  await page.waitForSelector("div.styles__StyledRightContainer-sc-15k3kqb-0", {
    timeout: 60000,
  });
  console.log("Found the top name account menu");

  await page.click("div.styles__StyledRightContainer-sc-15k3kqb-0");
  console.log("Clicked over the Accounts Button");

  await sleep(3000);
  // Wait for the specific span with text "Given value" to be present on the page
  const accountElement = await page.$x(`//span[contains(., "${account}")]`);

  console.log("Account found!");
  return accountElement;
};

const toggleLiveReportSwitch = async (page) => {
  await introSkip(page);
  // Get the parent container
  await page.waitForSelector("#realtime");
  // Get the checkbox element handle
  const checkboxHandle = await page.$("#realtime");

  if (checkboxHandle) {
    // Get the parent of the checkbox using evaluate
    const parentHandle = await checkboxHandle.evaluateHandle(
      (checkbox) => checkbox.parentElement
    );

    // Check if the value attribute is set to false
    const valueAttribute = await parentHandle.$eval("div", (div) =>
      div.getAttribute("value")
    );
    const isValueFalse = valueAttribute === "false";

    if (isValueFalse) {
      // Toggle the switch by clicking the checkbox
      await checkboxHandle.click();
    }
  }
};

const pauseCampaign = async (page, campaignName) => {
  await introSkip(page);
  const jsonData = await page.evaluate((campaignName) => {
    const pfDataTable = document.querySelector("pf-data-table");
    const shadowRoot = pfDataTable.shadowRoot;
    // Select the table element inside the shadow DOM
    const table = shadowRoot.querySelector("table");

    // Select all the rows in the table (excluding the header)
    const dataRows = table.querySelectorAll("tbody tr");

    let found = false;
    //Iterate through the data rows and collect their cell data
    dataRows.forEach((row) => {
      if (found) {
        return; // Break the loop if the target campaign has been found
      }
      const cells = row.querySelectorAll("td");

      cells.forEach((cell, index) => {
        let cellText = cell.textContent.trim();

        // Check if the cell contains a <slot> element
        const slotElement = cell.querySelector("slot");
        if (slotElement) {
          // Get the slot attribute value from the <slot> element
          const slotName = slotElement.getAttribute("name");
          if (slotName) {
            // Find the <div slot="${slotName}"> element in the shadow DOM
            const divSlotElement = pfDataTable.querySelector(
              `div[slot="${slotName}"]`
            );
            if (divSlotElement) {
              // Try to get the text value from the <a> element inside the div
              const linkElement = divSlotElement.querySelector("a");
              if (linkElement) {
                cellText = cellText + " " + linkElement.textContent.trim();
              } else {
                // If no <a> element found, use the text from the <div> element
                cellText = divSlotElement.textContent.trim();
              }
              if (cellText.includes(campaignName)) {
                console.log(cellText);
                found = true;
                let budgetSlotName = slotName.split("-")[0] + "-" + 13;
                const divSlotElement = pfDataTable.querySelector(
                  `div[slot="${budgetSlotName}"]`
                );
                let pauseButton = divSlotElement.querySelector(
                  ".styles__FlexBox-rxxhl-3 span:nth-child(3) div"
                );
                console.log(pauseButton);
                var clickEvent = new Event("click", {
                  bubbles: true,
                  cancelable: false,
                });
                pauseButton.dispatchEvent(clickEvent);
                console.log("Clicked on pause icon");
                // Click on the identified element
                return;
              }
            }
          }
        }
      });
    });
  },campaignName);

  await page.waitForSelector('.styles__DialogContent-aogigs-2');
  console.log("Found the confirmation Dialog ");
  const buttons = await page.$$('.styles__DialogContent-aogigs-2 button');
  // Check if the second button exists
  if (buttons.length >= 2) {
    // Click on the second button
    const secondButton = buttons[0];
    await secondButton.click();
    console.log("Clicked on the pause button");
  } else {
    console.error("Second button not found");
  }
};

const abortCampaign = async (page, campaignName) => {
  await introSkip(page);
  const jsonData = await page.evaluate((campaignName) => {
    const pfDataTable = document.querySelector("pf-data-table");
    const shadowRoot = pfDataTable.shadowRoot;
    // Select the table element inside the shadow DOM
    const table = shadowRoot.querySelector("table");

    // Select all the rows in the table (excluding the header)
    const dataRows = table.querySelectorAll("tbody tr");

    let found = false;
    //Iterate through the data rows and collect their cell data
    dataRows.forEach((row) => {
      if (found) {
        return; // Break the loop if the target campaign has been found
      }
      const cells = row.querySelectorAll("td");

      cells.forEach((cell, index) => {
        let cellText = cell.textContent.trim();

        // Check if the cell contains a <slot> element
        const slotElement = cell.querySelector("slot");
        if (slotElement) {
          // Get the slot attribute value from the <slot> element
          const slotName = slotElement.getAttribute("name");
          if (slotName) {
            // Find the <div slot="${slotName}"> element in the shadow DOM
            const divSlotElement = pfDataTable.querySelector(
              `div[slot="${slotName}"]`
            );
            if (divSlotElement) {
              // Try to get the text value from the <a> element inside the div
              const linkElement = divSlotElement.querySelector("a");
              if (linkElement) {
                cellText = cellText + " " + linkElement.textContent.trim();
              } else {
                // If no <a> element found, use the text from the <div> element
                cellText = divSlotElement.textContent.trim();
              }
              if (cellText.includes(campaignName)) {
                console.log(cellText);
                found = true;
                let budgetSlotName = slotName.split("-")[0] + "-" + 13;
                const divSlotElement = pfDataTable.querySelector(
                  `div[slot="${budgetSlotName}"]`
                );
                let pauseButton = divSlotElement.querySelector(
                  ".styles__FlexBox-rxxhl-3 span:nth-child(4) div"
                );
                console.log(pauseButton);
                var clickEvent = new Event("click", {
                  bubbles: true,
                  cancelable: false,
                });
                pauseButton.dispatchEvent(clickEvent);
                console.log("Clicked on abort icon");
                // Click on the identified element
                return;
              }
            }
          }
        }
      });
    });
  },campaignName);

  await page.waitForSelector('.styles__DialogContent-aogigs-2');
  console.log("Found the confirmation Dialog ");
  const buttons = await page.$$('.styles__DialogContent-aogigs-2 button');
  // Check if the second button exists
  if (buttons.length >= 2) {
    // Click on the second button
    const secondButton = buttons[0];
    await secondButton.click();
    console.log("Clicked on the abort confirmation button");
  } else {
    console.error("Abort confirmation button button not found");
  }
};
