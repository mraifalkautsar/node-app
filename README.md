This repository is made for MrScraper DevOps Technical Test purpose.

## Choice of Cloud Provider

The free trial of Google Cloud Provider is chosen for the Kubernetes deployment.

## CI/CD Pipeline

GitHub Actions is used for the CI/CD pipeline, and runs automatically on every push to the prod branch. Global environment variables are set to avoid hard-coding values. A single job named build-and-deploy runs on a fresh Ubuntu runner provided by GitHub. The steps are as follow:

### 1. Environment Variables

```yaml
env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/nimonspedia-node
  PROJECT_ID: project-22979784-7d52-40eb-92b
  PROJECT_NUMBER: 316934781449
  CLUSTER_NAME: cluster-test
  CLUSTER_REGION: asia-southeast1
  USE_GKE_GCLOUD_AUTH_PLUGIN: "True"
```

Minimal permissions are explicitly defined, following principle of least privilege:

* contents: read – required to check out the repository.
* packages: write – required to push images to GHCR.
* id-token: write – required for secure authentication to Google Cloud using OIDC (Workload Identity Federation).

---

### 2. Job Definition

```yaml
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
```

A single job named **`build-and-deploy`** runs on a fresh Ubuntu runner provided by GitHub.

---

### 4. Permissions

```yaml
permissions:
  contents: read
  packages: write
  id-token: write
```

Minimal permissions are explicitly defined:

* **contents: read** – required to check out the repository.
* **packages: write** – required to push images to GHCR.
* **id-token: write** – required for secure authentication to Google Cloud using OIDC (Workload Identity Federation).

This follows the **principle of least privilege**.

---

### 5. Checkout Source Code

```yaml
- name: Checkout repository
  uses: actions/checkout@v4
```

Fetches the latest version of the repository so the Docker image can be built from the current source code.

---

### 6. Authenticate to GitHub Container Registry (GHCR)

```yaml
- name: Log in to GitHub Container Registry
  uses: docker/login-action@v3
```

Logs in to GHCR using the automatically provided `GITHUB_TOKEN`.
This allows the workflow to **push Docker images without storing registry credentials manually**.

---

### 7. Build and Push Docker Image

```yaml
docker build -t $REGISTRY/$IMAGE_NAME:${{ github.sha }} .
docker push $REGISTRY/$IMAGE_NAME:${{ github.sha }}
```

* Builds a Docker image from the repository.
* Tags the image with the **Git commit SHA**, ensuring:

  * Immutable versions
  * Full traceability between code and deployed image
* Pushes the image to GHCR.

---

### 8. Authenticate to Google Cloud (OIDC / Workload Identity Federation)

```yaml
uses: google-github-actions/auth@v2
```

This step authenticates GitHub Actions to Google Cloud **without using service account keys**.

* Uses **Workload Identity Federation (OIDC)**.
* GitHub issues a short-lived identity token.
* Google Cloud maps it to a service account with GKE permissions.

This is the **recommended and most secure** authentication method.

---

### 9. Set Up Google Cloud SDK

```yaml
uses: google-github-actions/setup-gcloud@v2
```

Installs and configures the `gcloud` CLI, allowing interaction with Google Cloud services from the runner.

---

### 10. Set Up kubectl

```yaml
uses: azure/setup-kubectl@v4
```

Installs `kubectl`, the Kubernetes command-line tool used to apply manifests and manage deployments.

---

### 11. Install GKE Authentication Plugin

```yaml
gcloud components install gke-gcloud-auth-plugin
```

Installs the GKE authentication plugin required by newer Kubernetes versions to authenticate against GKE clusters.

---

### 12. Fetch GKE Cluster Credentials

```yaml
uses: google-github-actions/get-gke-credentials@v2
```

* Retrieves Kubernetes credentials for the target GKE cluster.
* Configures the kubeconfig on the runner.
* After this step, `kubectl` can directly interact with the cluster.

---

### 13. Deploy Kubernetes Manifests

```yaml
kubectl apply -f k8s/...
```

Applies all Kubernetes resources declaratively:

* **ConfigMaps and secrets**
* **Kubernetes Service Account and SecretProviderClass**
* **Service and Deployment**
* **Horizontal Pod Autoscaler**
* **Monitoring components (Node Exporter)**

This ensures the cluster state matches the repository configuration.

---

### 14. Update Deployment Image

```yaml
kubectl set image deployment/nimonspedia-node \
  nimonspedia-node=$REGISTRY/$IMAGE_NAME:${{ github.sha }}
```

Explicitly updates the Deployment to use the **newly built image** tagged with the current commit SHA.

This guarantees that:

* Each deployment corresponds to a specific Git revision.
* Rollbacks are possible by redeploying an older image tag.

---

### 15. Verify Rollout

```yaml
kubectl rollout status deployment/nimonspedia-node
```

Waits until the deployment completes successfully.

* Fails the pipeline if pods cannot start.
* Ensures broken deployments never silently succeed.

---

## Kubernetes Deployment

The k8s/app/deployment.yaml defines the nimonspedia-node application deployment. It specifies that there should be 3 replicas of the Node.js application, how the container is built (image, ports, resource limits), and how it accesses configuration (ConfigMap) and secrets (CSI Secrets Store).

## HPA

The k8s/hpa/hpa.yaml sets up a Horizontal Pod Autoscaler for the nimonspedia-node deployment. It ensures that the application scales automatically between 2 and 5 pods based on CPU utilization, targeting an average of 50%.

## Monitoring

### PM2 Logging

To ensure that PM2 logging works, the backend server is run using pm2-runtime.

### Node Exporter

The k8s/monitoring/node-exporter.yaml deploys a DaemonSet named node-exporter to the monitoring namespace. This ensures that a node-exporter pod runs on every Kubernetes node, collecting host-level metrics (e.g., CPU, memory, disk I/O) and exposing them for Prometheus to scrape.

### Prometheus

The Prometheus setup involves several files:

* k8s/monitoring/namespace.yaml: Creates a dedicated monitoring namespace.
* k8s/monitoring/prometheus-rbac.yaml: Defines a ServiceAccount and ClusterRole/ClusterRoleBinding to grant Prometheus the necessary permissions to discover and scrape metrics from Kubernetes nodes and pods.
* k8s/monitoring/prometheus-config.yaml: Configures Prometheus's scrape_configs to collect metrics from itself and from the node-exporter instances running across the cluster.
* k8s/monitoring/prometheus-deployment.yaml: Deploys the Prometheus server as a Deployment within the monitoring namespace, using the defined configuration and providing persistent storage for metrics.
* k8s/monitoring/prometheus-service.yaml: Creates a Kubernetes Service to expose the Prometheus UI and API on port 9090 within the cluster.

---

## Ingress

The k8s/ingress/ingress.yaml and k8s/ingress/ingressclass.yaml define an Ingress resource and IngressClass. The Ingress (nimonspedia-ingress) is configured to route external HTTP traffic from nimonspedia.your-domain.com to the nimonspedia-node-service on port 80. The ingressClass.yaml specifies GCE (Google Cloud Engine) as the controller for handling ingress. Although, for now, the Ingress manifests aren't applied to the cluster due to troubles with the GCE Controller.

---

## Secrets Management

To demonstrate secrets management, two methods are used:

* Google Secret Manager
* Kubernetes ConfigMap

### A. Google Secret Manager

To manage the secrets, Google Secret Manager is used. Each pod tries to impersonate a Kubernetes ServiceAccount (KSA) with this binding in the specifications:

```yaml
spec:
  serviceAccountName: nimonspedia-ksa
```

The nimonspedia-ksa then binds to the nimonspedia-gsa, a Google Service Account (GSA) used for the purpose of this project:

```yaml
annotations:
  iam.gke.io/gcp-service-account: nimonspedia-gsa@project-...iam.gserviceaccount.com
```

Thee GSA is then bound to IAM role: `roles/secretmanager.secretAccessor`, allowing GSA to read secret valuies.

To allow the KSA to be impersonated by GSA, an IAM binding `roles/iam.workloadIdentityUser` is applied.

With the Kubernetes pod automatically assuming the identity and permissions of the Google Service Account, secrets are fetched from GSM via the CSI driver. The secret-provider-class.yaml defines a SecretProviderClass that specifies gcp as the provider and points to the Google Service Account to use for authentication.

In the k8s/app/deployment.yaml, a volume of type csi is defined. This volume uses the secrets-store.csi.k8s.io driver and references the nimonspedia-gcp-secrets class from the previous step.
This CSI volume is mounted into the container at the path /mnt/secrets-store. When the pod starts, the CSI driver communicates with Google Secret Manager, fetches the DB_USER and DB_PASSWORD secrets, and writes them as files into the pod's filesystem at /mnt/secrets-store/DB_USER and /mnt/secrets-store/DB_PASSWORD.

---

### B. Kubernetes ConfigMap

Kubernetes config bindings are also used for the purpose of the project, for data that are not of utmost secrecy. Key/value config are injected as environment variables.

```yaml
env:
  - name: DB_HOST
    valueFrom:
      configMapKeyRef:
        name: nimonspedia-config
```
