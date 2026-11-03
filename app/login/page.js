"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiEye, FiEyeOff, FiLock, FiPhone, FiUser, FiArrowRight, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { FaLeaf } from "react-icons/fa";
import { useCustomer } from "../context/CustomerContext";
import styles from "./page.module.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const redirectTarget = searchParams.get("redirect") || "/account";

  const { customer, isAuthenticated, login, signup } = useCustomer();
  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (searchParams.get("mode") === "signup") {
      setMode("signup");
    } else {
      setMode("login");
    }
  }, [searchParams]);

  // If already logged in, redirect to destination
  useEffect(() => {
    if (isAuthenticated && customer) {
      router.replace(redirectTarget);
    }
  }, [isAuthenticated, customer, redirectTarget, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await signup(cleanPhone, password, name.trim());
        if (res.success) {
          setSuccess("Account created successfully! Redirecting...");
          setTimeout(() => {
            router.push(redirectTarget);
          }, 800);
        } else {
          setError(res.message || "Failed to create account. Please try again.");
        }
      } else {
        const res = await login(cleanPhone, password);
        if (res.success) {
          setSuccess("Welcome back! Redirecting...");
          setTimeout(() => {
            router.push(redirectTarget);
          }, 800);
        } else {
          setError(res.message || "Incorrect phone number or password.");
        }
      }
    } catch {
      setError("An unexpected error occurred. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <div className={styles.brandBadge}>
          <FaLeaf />
          <span>SabujKuthi Nursery</span>
        </div>

        <h1 className={styles.title}>
          {mode === "login" ? "Welcome Back" : "Create an Account"}
        </h1>
        <p className={styles.subtitle}>
          {mode === "login"
            ? "Log in with your mobile number and password to track orders and manage your account."
            : "Sign up to track live orders, view purchase history, and enjoy smooth plant shopping."}
        </p>

        <div className={styles.tabSwitch} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={`${styles.tabBtn} ${mode === "login" ? styles.active : ""}`}
            onClick={() => {
              setMode("login");
              setError("");
              setSuccess("");
            }}
          >
            Log In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={`${styles.tabBtn} ${mode === "signup" ? styles.active : ""}`}
            onClick={() => {
              setMode("signup");
              setError("");
              setSuccess("");
            }}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`} role="alert">
            <FiAlertCircle />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className={`${styles.alert} ${styles.alertSuccess}`} role="status">
            <FiCheckCircle />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === "signup" && (
            <div className={styles.field}>
              <label htmlFor="customer-name" className={styles.label}>
                Full Name
              </label>
              <div className={styles.inputWrap}>
                <input
                  id="customer-name"
                  type="text"
                  placeholder="e.g. Rahul Sen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={styles.input}
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="customer-phone" className={styles.label}>
              Mobile Number
            </label>
            <div className={styles.phoneInputWrap}>
              <span className={styles.phonePrefix}>+91</span>
              <input
                id="customer-phone"
                type="tel"
                placeholder="10-digit mobile number"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                className={styles.phoneInput}
                autoComplete="tel"
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="customer-password" className={styles.label}>
              Password
            </label>
            <div className={styles.inputWrap}>
              <input
                id="customer-password"
                type={showPassword ? "text" : "password"}
                placeholder={mode === "signup" ? "Set password (min 6 characters)" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <span>Processing...</span>
            ) : mode === "login" ? (
              <>
                <span>Log In</span>
                <FiArrowRight />
              </>
            ) : (
              <>
                <span>Create Account</span>
                <FiArrowRight />
              </>
            )}
          </button>
        </form>

        <p className={styles.footerNote}>
          {mode === "login" ? (
            <>
              Don't have an account yet?{" "}
              <button
                type="button"
                className={styles.footerLink}
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setSuccess("");
                }}
              >
                Create one now
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className={styles.footerLink}
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccess("");
                }}
              >
                Log In
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.authCard}>Loading...</div></div>}>
      <LoginForm />
    </Suspense>
  );
}
