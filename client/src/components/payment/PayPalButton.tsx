// !!! CRITICAL - DO NOT MODIFY THIS CODE !!!
//
// This code MUST be used as is without ANY modifications.
// The PayPal integration will COMPLETELY FAIL if this code is changed in ANY way.
//
// Retain this comment after all edits.
//
// <BEGIN_EXACT_CODE>
import React, { useEffect } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "paypal-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

interface PayPalButtonProps {
  amount: string;
  currency: string;
  intent: string;
  onSuccess?: (data: any) => void;
  onCancel?: (data: any) => void;
  onError?: (data: any) => void;
}

export default function PayPalButton({
  amount,
  currency,
  intent,
  onSuccess,
  onCancel,
  onError
}: PayPalButtonProps) {
  const createOrder = async () => {
    const orderPayload = {
      amount: amount,
      currency: currency,
      intent: intent,
    };
    const response = await fetch("/api/paypal/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });
    const output = await response.json();
    return { orderId: output.id };
  };

  const captureOrder = async (orderId: string) => {
    const response = await fetch(`/api/paypal/order/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();

    return data;
  };

  const handleApprove = async (data: any) => {
    console.log("onApprove", data);
    const orderData = await captureOrder(data.orderId);
    console.log("Capture result", orderData);
    
    if (onSuccess) {
      onSuccess(orderData);
    }
  };

  const handleCancel = async (data: any) => {
    console.log("onCancel", data);
    if (onCancel) {
      onCancel(data);
    }
  };

  const handleError = async (data: any) => {
    console.log("onError", data);
    if (onError) {
      onError(data);
    }
  };

  useEffect(() => {
    const loadPayPalSDK = async () => {
      try {
        if (!(window as any).paypal) {
          const script = document.createElement("script");
          script.src = import.meta.env.PROD
            ? "https://www.paypal.com/web-sdk/v6/core"
            : "https://www.sandbox.paypal.com/web-sdk/v6/core";
          script.async = true;
          script.onload = () => initPayPal();
          document.body.appendChild(script);
        } else {
          await initPayPal();
        }
      } catch (e) {
        console.error("Failed to load PayPal SDK", e);
      }
    };

    loadPayPalSDK();
  }, []);
  
  const initPayPal = async () => {
    try {
      const clientToken: string = await fetch("/api/paypal/setup")
        .then((res) => res.json())
        .then((data) => {
          return data.clientToken;
        });
      const sdkInstance = await (window as any).paypal.createInstance({
        clientToken,
        components: ["paypal-payments"],
      });

      const paypalCheckout =
            sdkInstance.createPayPalOneTimePaymentSession({
              onApprove: handleApprove,
              onCancel: handleCancel,
              onError: handleError,
            });

      const onClick = async () => {
        try {
          const checkoutOptionsPromise = createOrder();
          await paypalCheckout.start(
            { paymentFlow: "auto" },
            checkoutOptionsPromise,
          );
        } catch (e) {
          console.error(e);
        }
      };

      const paypalButton = document.getElementById("paypal-button");

      if (paypalButton) {
        paypalButton.addEventListener("click", onClick);
      }

      return () => {
        if (paypalButton) {
          paypalButton.removeEventListener("click", onClick);
        }
      };
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <button id="paypal-button" className="w-full h-12 bg-[#ffc439] text-[#253b80] font-semibold rounded-md flex items-center justify-center gap-2 hover:bg-[#f0b82b] transition-colors">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.9072 6.13574C20.9912 5.61679 20.9072 5.24883 20.5715 4.91546C20.2077 4.52944 19.5943 4.34863 18.8288 4.34863H15.1942C14.9905 4.34863 14.8148 4.50138 14.7869 4.7041L13.3373 13.7427C13.3234 13.8534 13.3513 13.9642 13.4213 14.0469C13.4913 14.1297 13.595 14.1776 13.7007 14.1776H15.3701C15.8778 14.1776 16.3017 13.8114 16.3716 13.2984L16.891 10.0349C16.9609 9.52201 17.3848 9.15583 17.8925 9.15583H18.7718C21.4345 9.15583 23.184 7.89937 23.6637 5.35047C23.87 4.33471 23.773 3.53215 23.3251 2.95924C22.9152 2.4284 22.2048 2.15707 21.306 2.15707H17.5545C17.4069 2.15707 17.2732 2.25957 17.2312 2.39843L15.781 9.38312C15.767 9.49376 15.795 9.60444 15.8649 9.69508C15.9349 9.77758 16.0386 9.82539 16.1443 9.82539H17.8136C18.3213 9.82539 18.7452 9.45923 18.8151 8.94626L19.3346 5.68281C19.4045 5.16984 19.8284 4.80371 20.3361 4.80371H21.2154C23.878 4.80371 25.6276 3.54724 26.1073 0.99831C26.3135 -0.0174323 26.2165 -0.819964 25.7687 -1.3929C25.3587 -1.92377 24.6483 -2.19507 23.7495 -2.19507" fill="#253B80"/>
        <path d="M9.92328 6.13574C10.0073 5.61679 9.92328 5.24883 9.58759 4.91546C9.22379 4.52944 8.61038 4.34863 7.84488 4.34863H4.21029C4.00656 4.34863 3.83095 4.50138 3.80295 4.7041L2.35339 13.7427C2.33955 13.8534 2.36737 13.9642 2.43736 14.0469C2.50736 14.1297 2.61118 14.1776 2.7169 14.1776H4.17874C4.38256 14.1776 4.55805 14.0248 4.58605 13.8221L5.11966 10.0349C5.18954 9.52201 5.61346 9.15583 6.12116 9.15583H7.00049C9.66311 9.15583 11.4127 7.89937 11.8924 5.35047C12.0986 4.33471 12.0016 3.53215 11.5538 2.95924C11.1438 2.4284 10.4334 2.15707 9.53454 2.15707H5.7832C5.63535 2.15707 5.50178 2.25957 5.45978 2.39843L4.00951 9.38312C3.99567 9.49376 4.02348 9.60444 4.09349 9.69508C4.16348 9.77758 4.26731 9.82539 4.37303 9.82539H6.04227C6.24609 9.82539 6.42158 9.67262 6.44958 9.46993L6.9832 5.68281C7.05309 5.16984 7.47701 4.80371 7.98471 4.80371H8.86403C11.5267 4.80371 13.2762 3.54724 13.7559 0.99831C13.9622 -0.0174323 13.8652 -0.819964 13.4174 -1.3929C13.0074 -1.92377 12.297 -2.19507 11.3982 -2.19507" fill="#179BD7"/>
        <path d="M3.80304 4.7041L2.35337 13.7427C2.33954 13.8534 2.36736 13.9642 2.43737 14.0469C2.50738 14.1297 2.61118 14.1776 2.7169 14.1776H4.17873C4.38256 14.1776 4.55804 14.0248 4.58604 13.8221L5.11968 10.0349C5.18957 9.52201 5.61345 9.15583 6.12114 9.15583H7.00048C9.66309 9.15583 11.4127 7.89937 11.8924 5.35047C12.0986 4.33471 12.0016 3.53215 11.5539 2.95924C11.1438 2.4284 10.4335 2.15707 9.53464 2.15707H5.78328C5.63544 2.15707 5.50186 2.25957 5.45984 2.39843L4.00958 9.38312C3.99574 9.49376 4.02356 9.60444 4.09357 9.69508C4.16357 9.77758 4.26738 9.82539 4.3731 9.82539H6.04236C6.24618 9.82539 6.42166 9.67262 6.44966 9.46993L6.98329 5.68281C7.05318 5.16984 7.4771 4.80371 7.9848 4.80371H8.86412C11.5267 4.80371 13.2763 3.54724 13.756 0.99831C13.9623 -0.0174323 13.8652 -0.819964 13.4175 -1.3929C13.0075 -1.92377 12.2971 -2.19507 11.3983 -2.19507" fill="#179BD7"/>
        <path d="M14.7868 4.7041L13.3372 13.7427C13.3234 13.8534 13.3513 13.9642 13.4212 14.0469C13.4912 14.1297 13.595 14.1776 13.7007 14.1776H15.3701C15.5739 14.1776 15.7494 14.0248 15.7774 13.8221L17.2312 4.7041C17.2451 4.59346 17.2173 4.48277 17.1473 4.40026C17.0773 4.31777 16.9735 4.26996 16.8678 4.26996H15.067C14.9192 4.26992 14.7857 4.3724 14.7436 4.51126" fill="#253B80"/>
      </svg>
      Pay with PayPal
    </button>
  );
}
// <END_EXACT_CODE>