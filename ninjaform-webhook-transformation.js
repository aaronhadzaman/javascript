import { sha256 } from "@rs/hash/v1";

function getCurrentTimestamp() {
  const date = new Date();
  return date.getFullYear() +
    '-' + String(date.getMonth() + 1).padStart(2, '0') +
    '-' + String(date.getDate()).padStart(2, '0') +
    'T' + String(date.getHours()).padStart(2, '0') +
    ':' + String(date.getMinutes()).padStart(2, '0') +
    ':' + String(date.getSeconds()).padStart(2, '0');
}

// NEW CODE -- MAPPING OF PROPERTY NAMES
const propertyMapping = {
  "fname": "first_name",
  "lname": "last_name",
  "favTeam": "fave_team",
  "unsubscribe_email": "email"
  // Add more mappings as needed
};


export async function transformEvent(event, metadata) {
  let attributes = {};
  let events = [];
  let sourceUrl = null; // Initialize sourceUrl
  let eventName = "form_submitted";

  const formData = event.properties.form_submit_data;

  let hashedEmail = null;

  for (let field in formData) {
    let key = formData[field].key;
    let value = formData[field].value;

    if (key !== "submit" && key !=="no_identify" && !key.startsWith("html_")) {
    if (key === "marketing_consent") {
      if (value == 1) { // Check if marketing consent is given
        key = "email_subscribe";
        value = "opted_in";
        attributes[key] = value; // Add only if consent is given
        eventName = "email_opt_in";
      }
      // If marketing_consent is not 1, do not add email_subscribe to attributes
      continue; // Skip the rest of the loop iteration
    } else if (key === "source") {
      sourceUrl = value; // Assign value from formData
      continue;
    }

      if (key.startsWith("subscription_group_id_")) {
        attributes["subscription_groups"] = attributes["subscription_groups"] || [];
        attributes["subscription_groups"].push({
          "subscription_group_id": value,
          "subscription_state": "subscribed"
        });
        continue;
      }

      // NEW CODE -- USE MAPPING TO TRANSFORM NAMES
      if (propertyMapping[key]) {
        key = propertyMapping[key];
      }
      attributes[key] = value;
      

    }
  }

  // Check if postal_code exists and remove spaces
  if (attributes["postal_code"]) {
    attributes["postal_code"] = attributes["postal_code"].replace(/\s+/g, '');
  }

  // List of optional keys
  const optionalKeys = ["fave_team", "postal_code", "company", "additional_information"];

  // Remove optional keys if they are null or undefined
  optionalKeys.forEach(key => {
    if (attributes[key] === null || attributes[key] === undefined || attributes[key]==="") {
      delete attributes[key];
    }
  });

  // Add recent_email_opt_in_source attribute
  if (sourceUrl) {
  let sourceKey = eventName === "form_submitted" ? "recent_form_submission_source" : "recent_email_opt_in_source";
  attributes[sourceKey] = sourceUrl;
}

  // Validate email
  if (attributes.email) {
    if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(attributes.email)) {
      const cleanedEmail = attributes.email.replace(/\s/g, '').toLowerCase();
      hashedEmail = sha256(cleanedEmail);
      attributes.external_id = hashedEmail;
      attributes.email = cleanedEmail;
    } else {
      delete attributes.email; // Remove invalid email
    }
  }

  const currentTimestamp = getCurrentTimestamp();

  const eventObject = {
    "external_id": hashedEmail,
    "email": [attributes.email],
    "name": eventName,
    "timestamp": currentTimestamp,
    "properties": { "source": sourceUrl, "timestamp": currentTimestamp}
  };

  // Add the event
  events.push(eventObject);

  const trackPayload = {
    "type": "track",
    "event": eventObject.name,
    "timestamp": currentTimestamp,
    "userId": hashedEmail,
    "traits": attributes,
    "properties": eventObject.properties
  };

  return trackPayload;
}
